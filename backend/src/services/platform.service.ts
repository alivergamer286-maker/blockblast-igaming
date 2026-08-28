import { prisma } from "../utils/prisma";
import { config } from "../config";

export type PlatformSettings = {
  houseEdge: number;
  pointsPerUnit: number;
  maxMultiplier: number;
  minBet: number;
  maxBet: number;
  returnCap: number;
  /** 0–100+: % of stake max return to player (20 = max 20% of bet) */
  playerReturnPct: number;
  engagementEnabled: boolean;
  engagementHookGames: number;
  engagementHookPct: number;
  engagementTightPct: number;
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
  };
}

export async function updatePlatformSettings(
  patch: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  await getPlatformSettings();
  const data: any = {};
  if (patch.houseEdge !== undefined) data.houseEdge = patch.houseEdge;
  if (patch.pointsPerUnit !== undefined) data.pointsPerUnit = patch.pointsPerUnit;
  if (patch.maxMultiplier !== undefined) data.maxMultiplier = patch.maxMultiplier;
  if (patch.minBet !== undefined) data.minBet = patch.minBet;
  if (patch.maxBet !== undefined) data.maxBet = patch.maxBet;
  if (patch.returnCap !== undefined) data.returnCap = patch.returnCap;
  if (patch.playerReturnPct !== undefined) data.playerReturnPct = patch.playerReturnPct;
  if (patch.engagementEnabled !== undefined) data.engagementEnabled = patch.engagementEnabled;
  if (patch.engagementHookGames !== undefined) data.engagementHookGames = patch.engagementHookGames;
  if (patch.engagementHookPct !== undefined) data.engagementHookPct = patch.engagementHookPct;
  if (patch.engagementTightPct !== undefined) data.engagementTightPct = patch.engagementTightPct;

  await prisma.platformConfig.update({ where: { id: "default" }, data });
  return getPlatformSettings();
}

export type PayoutContext = {
  playerReturnPct?: number | null;
  engagementMode?: string;
  gamesPlayed?: number;
  eventMultiplier?: number;
};

/**
 * Score builds a theoretical win, then hard-capped by playerReturnPct% of stake.
 * Example: bet 20, playerReturnPct 20 → max R$ 4.00 back (house keeps the rest of the edge).
 */
export function calcPayout(
  bet: number,
  score: number,
  settings: PlatformSettings,
  ctx: PayoutContext = {}
): number {
  if (bet <= 0 || score <= 0) return 0;

  let pct = ctx.playerReturnPct != null ? Number(ctx.playerReturnPct) : settings.playerReturnPct;

  // engagement: first N games more generous, then tight
  const mode = ctx.engagementMode || "off";
  const played = ctx.gamesPlayed ?? 0;
  if (mode === "force_hook") {
    pct = settings.engagementHookPct;
  } else if (mode === "force_tight") {
    pct = settings.engagementTightPct;
  } else if (mode === "auto" || settings.engagementEnabled) {
    pct =
      played < settings.engagementHookGames
        ? settings.engagementHookPct
        : settings.engagementTightPct;
  }

  const rawMult = score / settings.pointsPerUnit;
  const mult = Math.min(rawMult, settings.maxMultiplier);
  const eventMult = ctx.eventMultiplier && ctx.eventMultiplier > 0 ? ctx.eventMultiplier : 1;
  let net = bet * mult * (1 - settings.houseEdge) * eventMult;

  const capByPct = bet * (Math.max(0, pct) / 100);
  const capByReturn = bet * settings.returnCap;
  const cap = Math.min(capByPct, capByReturn);
  if (net > cap) net = cap;

  return Math.floor(net * 100) / 100;
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
