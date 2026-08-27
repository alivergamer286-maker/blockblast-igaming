import { prisma } from "../utils/prisma";
import { config } from "../config";

export type PlatformSettings = {
  houseEdge: number;
  pointsPerUnit: number;
  maxMultiplier: number;
  minBet: number;
  maxBet: number;
  /** max return as multiple of stake (0.2 = max 20% of bet back) */
  returnCap: number;
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  let row = await prisma.platformConfig.findUnique({ where: { id: "default" } });
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
      },
    });
  }
  return {
    houseEdge: Number(row.houseEdge),
    pointsPerUnit: Number(row.pointsPerUnit),
    maxMultiplier: Number(row.maxMultiplier),
    minBet: Number(row.minBet),
    maxBet: Number(row.maxBet),
    returnCap: Number((row as any).returnCap ?? 2),
  };
}

export async function updatePlatformSettings(
  patch: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  await getPlatformSettings();
  const row = await prisma.platformConfig.update({
    where: { id: "default" },
    data: {
      ...(patch.houseEdge !== undefined ? { houseEdge: patch.houseEdge } : {}),
      ...(patch.pointsPerUnit !== undefined
        ? { pointsPerUnit: patch.pointsPerUnit }
        : {}),
      ...(patch.maxMultiplier !== undefined
        ? { maxMultiplier: patch.maxMultiplier }
        : {}),
      ...(patch.minBet !== undefined ? { minBet: patch.minBet } : {}),
      ...(patch.maxBet !== undefined ? { maxBet: patch.maxBet } : {}),
      ...(patch.returnCap !== undefined ? { returnCap: patch.returnCap } : {}),
    },
  });
  return {
    houseEdge: Number(row.houseEdge),
    pointsPerUnit: Number(row.pointsPerUnit),
    maxMultiplier: Number(row.maxMultiplier),
    minBet: Number(row.minBet),
    maxBet: Number(row.maxBet),
    returnCap: Number((row as any).returnCap ?? 2),
  };
}

/**
 * payout grows with score, reduced by houseEdge, hard-capped by returnCap * bet.
 * Example: bet 20, returnCap 0.2 → never pays more than R$ 4.00
 */
export function calcPayout(
  bet: number,
  score: number,
  settings: PlatformSettings
): number {
  if (bet <= 0 || score <= 0) return 0;
  const rawMult = score / settings.pointsPerUnit;
  const mult = Math.min(rawMult, settings.maxMultiplier);
  let net = bet * mult * (1 - settings.houseEdge);
  const cap = bet * settings.returnCap;
  if (net > cap) net = cap;
  return Math.floor(net * 100) / 100;
}
