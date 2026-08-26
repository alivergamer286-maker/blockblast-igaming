import { prisma } from "../utils/prisma";
import { config } from "../config";

export type PlatformSettings = {
  houseEdge: number;
  pointsPerUnit: number;
  maxMultiplier: number;
  minBet: number;
  maxBet: number;
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
      },
    });
  }
  return {
    houseEdge: Number(row.houseEdge),
    pointsPerUnit: Number(row.pointsPerUnit),
    maxMultiplier: Number(row.maxMultiplier),
    minBet: Number(row.minBet),
    maxBet: Number(row.maxBet),
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
    },
  });
  return {
    houseEdge: Number(row.houseEdge),
    pointsPerUnit: Number(row.pointsPerUnit),
    maxMultiplier: Number(row.maxMultiplier),
    minBet: Number(row.minBet),
    maxBet: Number(row.maxBet),
  };
}

/** payout = bet * min(score / pointsPerUnit, maxMultiplier) * (1 - houseEdge) */
export function calcPayout(
  bet: number,
  score: number,
  settings: PlatformSettings
): number {
  if (bet <= 0 || score <= 0) return 0;
  const rawMult = score / settings.pointsPerUnit;
  const mult = Math.min(rawMult, settings.maxMultiplier);
  const gross = bet * mult;
  const net = gross * (1 - settings.houseEdge);
  return Math.floor(net * 100) / 100;
}
