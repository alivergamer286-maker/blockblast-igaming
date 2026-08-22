import { prisma } from "../utils/prisma";
import {
  createInitialState,
  applyMove,
  GameState,
  Board,
} from "../game/engine";
import { Piece } from "../game/pieces";
import { debit, credit } from "./wallet.service";
import { config } from "../config";

function asBoard(value: unknown): Board {
  return value as Board;
}

function asPieces(value: unknown): Piece[] {
  return value as Piece[];
}

export async function startSession(userId: string, betAmount: number = 0) {
  if (betAmount < 0 || betAmount > config.maxBet) {
    throw new Error(`Bet must be between 0 and ${config.maxBet}`);
  }

  await prisma.gameSession.updateMany({
    where: { userId, status: "active" },
    data: { status: "abandoned", endedAt: new Date() },
  });

  if (betAmount > 0) {
    await debit(userId, betAmount, "bet", undefined, "Game bet");
  }

  const state = createInitialState();

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
      betAmount,
    },
  });

  return {
    sessionId: session.id,
    board: state.board,
    pieces: state.pieces,
    score: 0,
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

  const board = asBoard(session.boardState);
  const pieces = asPieces(session.currentPieces);

  const state: GameState = {
    board,
    pieces,
    score: session.score,
    linesCleared: session.linesCleared,
    combo: session.combos,
    maxCombo: session.maxCombo,
    streak: session.combos,
  };

  const result = applyMove(state, pieceIndex, row, col);
  if (!result.success) throw new Error(result.message || "Invalid move");

  const newScore = session.score + result.totalPoints;
  const newLines = session.linesCleared + result.linesCleared;
  const newCombo = result.linesCleared > 0 ? session.combos + 1 : 0;
  const newMaxCombo = Math.max(session.maxCombo, newCombo);

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

  const updateData: {
    boardState: object;
    currentPieces: object;
    score: number;
    linesCleared: number;
    combos: number;
    maxCombo: number;
    status?: string;
    endedAt?: Date;
    payout?: number;
  } = {
    boardState: result.board as object,
    currentPieces: remainingPieces as object,
    score: newScore,
    linesCleared: newLines,
    combos: newCombo,
    maxCombo: newMaxCombo,
  };

  if (result.isGameOver) {
    updateData.status = "finished";
    updateData.endedAt = new Date();

    const bet = Number(session.betAmount);
    if (bet > 0) {
      const multiplier = Math.min(newScore / 5000, 10);
      const payout = Math.floor(bet * multiplier * 100) / 100;
      updateData.payout = payout;
      if (payout > 0) {
        await credit(userId, payout, "win", sessionId, `Win - score ${newScore}`);
      }
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
    payout: result.isGameOver ? Number(updateData.payout || 0) : undefined,
  };
}

export async function endSession(userId: string, sessionId: string) {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, userId, status: "active" },
  });
  if (!session) throw new Error("Active session not found");

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "finished", endedAt: new Date() },
  });

  await prisma.score.create({
    data: {
      userId,
      score: session.score,
      linesCleared: session.linesCleared,
      maxCombo: session.maxCombo,
    },
  });

  return { score: session.score };
}

export async function getSession(userId: string, sessionId: string) {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found");
  return session;
}
