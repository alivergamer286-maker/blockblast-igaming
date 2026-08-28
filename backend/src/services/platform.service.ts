import { prisma } from "../utils/prisma";
import { config } from "../config";

export type PlatformSettings = {
  houseEdge: number;
  pointsPerUnit: number;
  maxMultiplier: number;
  minBet: number;
  maxBet: number;
  returnCap: number;
  playerReturnPct: number;
  engagementEnabled: boolean;
  engagementHookGames: number;
  engagementHookPct: number;
  engagementTightPct: number;
  /** % of sessions that may receive a non-zero payout (house still capped) */
  winRatePct: number;
  housePool: number;
  ownerEmail: string | null;
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  let row: any = await prisma.platformConfig.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.platformConfig.create({
      data: {
        id: "default",
        houseEdge: 0.05,
        pointsPerUnit: 500,
        maxMultiplier: 10,
        minBet: config.minBet,
        maxBet: config.maxBet,
        returnCap: 2.0,
        playerReturnPct: 100,
        engagementEnabled: false,
        engagementHookGames: 5,
        engagementHookPct: 120,
        engagementTightPct: 20,
        winRatePct: 50,
        housePool: 0,
        ownerEmail: process.env.OWNER_EMAIL || null,
      } as any,
    });
  }
  return {
    houseEdge: Number(row.houseEdge),
    pointsPerUnit: Number(row.pointsPerUnit),
    maxMultiplier: Number(row.maxMultiplier),
    minBet: Number(row.minBet),
    maxBet: Number(row.maxBet),
    returnCap: Number(row.returnCap ?? 2),
    playerReturnPct: Number(row.playerReturnPct ?? 100),
    engagementEnabled: Boolean(row.engagementEnabled),
    engagementHookGames: Number(row.engagementHookGames ?? 5),
    engagementHookPct: Number(row.engagementHookPct ?? 120),
    engagementTightPct: Number(row.engagementTightPct ?? 20),
    winRatePct: Number(row.winRatePct ?? 50),
    housePool: Number(row.housePool ?? 0),
    ownerEmail: row.ownerEmail || process.env.OWNER_EMAIL || null,
  };
}

export async function updatePlatformSettings(
  patch: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  await getPlatformSettings();
  const data: any = {};
  const keys: (keyof PlatformSettings)[] = [
    "houseEdge",
    "pointsPerUnit",
    "maxMultiplier",
    "minBet",
    "maxBet",
    "returnCap",
    "playerReturnPct",
    "engagementEnabled",
    "engagementHookGames",
    "engagementHookPct",
    "engagementTightPct",
    "winRatePct",
    "housePool",
  ];
  for (const k of keys) {
    if (patch[k] !== undefined) data[k] = patch[k];
  }
  await prisma.platformConfig.update({ where: { id: "default" }, data });
  return getPlatformSettings();
}

/** Bets increase pool; wins decrease pool. */
export async function adjustHousePool(delta: number) {
  await getPlatformSettings();
  const row: any = await prisma.platformConfig.findUnique({ where: { id: "default" } });
  const next = Math.max(0, Math.round((Number(row.housePool || 0) + delta) * 100) / 100);
  await prisma.platformConfig.update({
    where: { id: "default" },
    data: { housePool: next } as any,
  });
  return next;
}

export type PayoutContext = {
  playerReturnPct?: number | null;
  engagementMode?: string;
  gamesPlayed?: number;
  eventMultiplier?: number;
  /** session flagged as loser by win-rate control */
  forceZeroWin?: boolean;
};

export function calcPayout(
  bet: number,
  score: number,
  settings: PlatformSettings,
  ctx: PayoutContext = {}
): number {
  if (bet <= 0 || score <= 0) return 0;
  if (ctx.forceZeroWin) return 0;

  let pct =
    ctx.playerReturnPct != null ? Number(ctx.playerReturnPct) : settings.playerReturnPct;

  const mode = ctx.engagementMode || "off";
  const played = ctx.gamesPlayed ?? 0;
  if (mode === "force_hook") pct = settings.engagementHookPct;
  else if (mode === "force_tight") pct = settings.engagementTightPct;
  else if (mode === "auto" || settings.engagementEnabled) {
    pct =
      played < settings.engagementHookGames
        ? settings.engagementHookPct
        : settings.engagementTightPct;
  }

  const rawMult = score / settings.pointsPerUnit;
  const mult = Math.min(rawMult, settings.maxMultiplier);
  const eventMult = ctx.eventMultiplier && ctx.eventMultiplier > 0 ? ctx.eventMultiplier : 1;
  let net = bet * mult * (1 - settings.houseEdge) * eventMult;

  // % of stake that can return (20 on R$20 bet => max R$4)
  const capByPct = bet * (Math.max(0, pct) / 100);
  const capByReturn = bet * settings.returnCap;
  let cap = Math.min(capByPct, capByReturn);

  // cannot pay more than house pool
  if (settings.housePool >= 0) {
    cap = Math.min(cap, settings.housePool);
  }

  if (net > cap) net = cap;
  return Math.floor(net * 100) / 100;
}

/** How close current theoretical payout is to the player cap (0–1) for difficulty. */
export function difficultyFromPayoutProgress(
  bet: number,
  score: number,
  settings: PlatformSettings,
  ctx: PayoutContext = {}
): number {
  if (bet <= 0) return 0;
  const uncapped = calcPayout(bet, score, { ...settings, housePool: 1e12 }, {
    ...ctx,
    forceZeroWin: false,
  });
  let pct =
    ctx.playerReturnPct != null ? Number(ctx.playerReturnPct) : settings.playerReturnPct;
  const cap = bet * (Math.max(0, pct) / 100);
  if (cap <= 0) return 1;
  const ratio = uncapped / cap;
  if (ratio < 0.5) return 0;
  if (ratio < 0.75) return 0.35;
  if (ratio < 0.9) return 0.65;
  return 0.95;
}

export async function getActiveEventMultiplier(): Promise<number> {
  const now = new Date();
  const ev = await prisma.event.findFirst({
    where: {
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { multiplier: "desc" },
  });
  return ev ? Number(ev.multiplier) : 1;
}

/** Decide if this session is in the "can win" cohort for winRatePct. */
export function rollSessionCanWin(winRatePct: number): boolean {
  const rate = Math.max(0, Math.min(100, winRatePct)) / 100;
  return Math.random() < rate;
}
