import { prisma } from "../utils/prisma";
import {
  createInitialState,
  applyMove,
  GameState,
  Board,
} from "../game/engine";
import { Piece } from "../game/pieces";
import { debit, credit } from "./wallet.service";
import {
  getPlatformSettings,
  calcPayout,
  getActiveEventMultiplier,
  adjustHousePool,
  difficultyFromPayoutProgress,
  rollSessionCanWin,
} from "./platform.service";
import { recordAffiliateWager } from "./affiliate.service";

function asBoard(value: unknown): Board {
  return value as Board;
}

function asPieces(value: unknown): Piece[] {
  return value as Piece[];
}

function round2(n: number) {
  return Math.floor(n * 100) / 100;
}

async function payoutCtx(userId: string, forceZeroWin?: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const eventMultiplier = await getActiveEventMultiplier();
  return {
    user,
    ctx: {
      playerReturnPct: user.playerReturnPct != null ? Number(user.playerReturnPct) : null,
      engagementMode: user.engagementMode || "off",
      gamesPlayed: user.gamesPlayed ?? 0,
      eventMultiplier,
      forceZeroWin: Boolean(forceZeroWin),
    },
  };
}

export async function startSession(userId: string, betAmount: number = 0) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.status !== "active") throw new Error("Account not active");

  const settings = await getPlatformSettings();
  const bet = round2(Number(betAmount) || 0);

  if (bet < 0) throw new Error("Bet cannot be negative");
  if (bet > 0 && bet < settings.minBet) {
    throw new Error(`Minimum bet is ${settings.minBet}`);
  }
  if (bet > settings.maxBet) {
    throw new Error(`Maximum bet is ${settings.maxBet}`);
  }

  await prisma.gameSession.updateMany({
    where: { userId, status: "active" },
    data: { status: "abandoned", endedAt: new Date() },
  });

  if (bet > 0) {
    await debit(userId, bet, "bet", `bet:${userId}:${Date.now()}`, "Game stake");
    await recordAffiliateWager(userId, bet);
    // stake feeds the house pool (available to pay winners)
    await adjustHousePool(bet);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { gamesPlayed: { increment: 1 } },
  });

  // only winRatePct% of sessions can cash out non-zero (pool still applies)
  const canWin = bet <= 0 ? true : rollSessionCanWin(settings.winRatePct);
  // if pool is empty, nobody can extract real money
  const poolOk = settings.housePool + bet > 0.01;

  const state = createInitialState(0);

  const session = await prisma.gameSession.create({
    data: {
      userId,
      status: "active",
      score: 0,
      linesCleared: 0,
      combos: 0,
      maxCombo: 0,
      boardState: state.board as object,
      currentPieces: state.pieces as object,
      pieceIndex: 0,
      betAmount: bet,
      potentialWin: 0,
      canWin: canWin && poolOk,
    } as any,
  });

  return {
    sessionId: session.id,
    board: state.board,
    pieces: state.pieces,
    score: 0,
    betAmount: bet,
    potentialWin: 0,
    settings: {
      minBet: settings.minBet,
      maxBet: settings.maxBet,
      playerReturnPct: settings.playerReturnPct,
    },
  };
}

export async function placePiece(
  userId: string,
  sessionId: string,
  pieceIndex: number,
  row: number,
  col: number
) {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, userId, status: "active" },
  });
  if (!session) throw new Error("Active session not found");

  const settings = await getPlatformSettings();
  const forceZero = (session as any).canWin === false;
  const { ctx } = await payoutCtx(userId, forceZero);
  const board = asBoard(session.boardState);
  const pieces = asPieces(session.currentPieces);
  const bet = Number(session.betAmount);

  const bias = difficultyFromPayoutProgress(bet, session.score, settings, ctx);

  const state: GameState = {
    board,
    pieces,
    score: session.score,
    linesCleared: session.linesCleared,
    combo: session.combos,
    maxCombo: session.maxCombo,
    streak: session.combos,
  };

  const result = applyMove(state, pieceIndex, row, col, bias);
  if (!result.success) throw new Error(result.message || "Invalid move");

  const newScore = session.score + result.totalPoints;
  const newLines = session.linesCleared + result.linesCleared;
  const newCombo = result.linesCleared > 0 ? session.combos + 1 : 0;
  const newMaxCombo = Math.max(session.maxCombo, newCombo);
  // refresh pool into settings for cap
  const liveSettings = await getPlatformSettings();
  const potentialWin = calcPayout(bet, newScore, liveSettings, ctx);

  let remainingPieces = pieces.filter((_, i) => i !== pieceIndex);
  if (result.newPieces) remainingPieces = result.newPieces;

  await prisma.move.create({
    data: {
      sessionId,
      pieceIndex,
      pieceShape: pieces[pieceIndex].shape as object,
      positionX: col,
      positionY: row,
      linesCleared: result.linesCleared,
      pointsEarned: result.totalPoints,
      boardAfter: result.board as object,
    },
  });

  const updateData: Record<string, unknown> = {
    boardState: result.board as object,
    currentPieces: remainingPieces as object,
    score: newScore,
    linesCleared: newLines,
    combos: newCombo,
    maxCombo: newMaxCombo,
    potentialWin,
  };

  let payout = 0;
  if (result.isGameOver) {
    updateData.status = "finished";
    updateData.endedAt = new Date();
    payout = potentialWin;
    updateData.payout = payout;
    if (payout > 0) {
      await credit(userId, payout, "win", `win:${sessionId}`, `Win score ${newScore}`);
      await adjustHousePool(-payout);
    }
    await prisma.score.create({
      data: {
        userId,
        score: newScore,
        linesCleared: newLines,
        maxCombo: newMaxCombo,
      },
    });
  }

  await prisma.gameSession.update({ where: { id: sessionId }, data: updateData });

  return {
    board: result.board,
    pieces: remainingPieces,
    score: newScore,
    linesCleared: result.linesCleared,
    pointsEarned: result.totalPoints,
    combo: newCombo,
    maxCombo: newMaxCombo,
    isGameOver: result.isGameOver,
    clearedRows: result.clearedRows,
    clearedCols: result.clearedCols,
    betAmount: bet,
    potentialWin,
    nearMiss: result.nearMiss ?? null,
    payout: result.isGameOver ? payout : undefined,
  };
}

export async function endSession(userId: string, sessionId: string) {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, userId, status: "active" },
  });
  if (!session) throw new Error("Active session not found");

  const settings = await getPlatformSettings();
  const forceZero = (session as any).canWin === false;
  const { ctx } = await payoutCtx(userId, forceZero);
  const bet = Number(session.betAmount);
  const payout = calcPayout(bet, session.score, settings, ctx);

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      status: "cashed_out",
      endedAt: new Date(),
      payout,
      potentialWin: payout,
    },
  });

  if (payout > 0) {
    await credit(
      userId,
      payout,
      "cashout",
      `cashout:${sessionId}`,
      `Cashout score ${session.score}`
    );
    await adjustHousePool(-payout);
  }

  await prisma.score.create({
    data: {
      userId,
      score: session.score,
      linesCleared: session.linesCleared,
      maxCombo: session.maxCombo,
    },
  });

  return {
    score: session.score,
    betAmount: bet,
    payout,
    profit: round2(payout - bet),
  };
}
