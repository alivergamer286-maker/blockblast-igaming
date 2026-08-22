import { prisma } from "../utils/prisma";

export async function getGlobalLeaderboard(limit = 50) {
  const scores = await prisma.score.findMany({
    orderBy: { score: "desc" },
    take: limit,
    include: {
      user: {
        select: { username: true },
      },
    },
  });

  return scores.map((s, index) => ({
    rank: index + 1,
    username: s.user.username,
    score: s.score,
    linesCleared: s.linesCleared,
    maxCombo: s.maxCombo,
    date: s.createdAt,
  }));
}

export async function getDailyLeaderboard(limit = 50) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const scores = await prisma.score.findMany({
    where: {
      createdAt: { gte: startOfDay },
    },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      user: {
        select: { username: true },
      },
    },
  });

  return scores.map((s, index) => ({
    rank: index + 1,
    username: s.user.username,
    score: s.score,
    linesCleared: s.linesCleared,
    maxCombo: s.maxCombo,
    date: s.createdAt,
  }));
}

export async function getUserHistory(userId: string, limit = 20) {
  return prisma.score.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
