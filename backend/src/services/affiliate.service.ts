import crypto from "crypto";
import { prisma } from "../utils/prisma";
import { writeAudit } from "./audit.service";

function genCode(username: string): string {
  const base = username.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${base || "AFF"}${suffix}`;
}

export async function createAffiliate(
  adminId: string,
  opts: { userId?: string; emailOrUsername?: string; commissionRate?: number; notes?: string },
  ip?: string
) {
  let userId = opts.userId;
  if (!userId && opts.emailOrUsername) {
    const key = opts.emailOrUsername.trim();
    const u = await prisma.user.findFirst({
      where: {
        OR: [{ email: key.toLowerCase() }, { username: key }],
      },
    });
    if (!u) throw new Error("User not found");
    userId = u.id;
  }
  if (!userId) throw new Error("userId or emailOrUsername required");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const existing = await prisma.affiliateProfile.findUnique({ where: { userId } });
  if (existing) throw new Error("User is already an affiliate");

  const rate =
    opts.commissionRate !== undefined
      ? Math.min(0.5, Math.max(0, opts.commissionRate))
      : 0.1;

  const code = genCode(user.username);

  const profile = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId! },
      data: { role: user.role === "admin" ? "admin" : "affiliate" },
    });
    return tx.affiliateProfile.create({
      data: {
        userId: userId!,
        code,
        commissionRate: rate,
        notes: opts.notes,
      },
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
    });
  });

  await writeAudit({
    actorId: adminId,
    action: "affiliate.create",
    targetType: "user",
    targetId: userId,
    meta: { code, commissionRate: rate },
    ip,
  });

  return {
    ...profile,
    commissionRate: Number(profile.commissionRate),
    totalWagered: Number(profile.totalWagered),
    totalCommission: Number(profile.totalCommission),
  };
}

export async function listAffiliates(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.affiliateProfile.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, username: true, status: true } },
      },
    }),
    prisma.affiliateProfile.count(),
  ]);

  return {
    items: items.map((a) => ({
      ...a,
      commissionRate: Number(a.commissionRate),
      totalWagered: Number(a.totalWagered),
      totalCommission: Number(a.totalCommission),
    })),
    total,
    page,
    limit,
  };
}

export async function getAffiliateDetail(affiliateUserId: string) {
  const profile = await prisma.affiliateProfile.findUnique({
    where: { userId: affiliateUserId },
    include: {
      user: { select: { id: true, email: true, username: true } },
    },
  });
  if (!profile) throw new Error("Affiliate not found");

  const referrals = await prisma.user.findMany({
    where: { referredById: affiliateUserId },
    select: {
      id: true,
      username: true,
      email: true,
      balance: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const wagerAgg = await prisma.transaction.aggregate({
    where: {
      type: "bet",
      user: { referredById: affiliateUserId },
    },
    _sum: { amount: true },
  });

  return {
    profile: {
      ...profile,
      commissionRate: Number(profile.commissionRate),
      totalWagered: Number(profile.totalWagered),
      totalCommission: Number(profile.totalCommission),
    },
    referrals: referrals.map((r) => ({
      ...r,
      balance: Number(r.balance),
      sessionsCount: r._count.sessions,
    })),
    referredWagerVolume: Math.abs(Number(wagerAgg._sum.amount || 0)),
  };
}

export async function attachReferral(newUserId: string, code: string) {
  const aff = await prisma.affiliateProfile.findFirst({
    where: { code: code.toUpperCase().trim(), active: true },
  });
  if (!aff) throw new Error("Invalid affiliate code");
  if (aff.userId === newUserId) throw new Error("Cannot refer yourself");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: newUserId },
      data: { referredById: aff.userId },
    }),
    prisma.affiliateProfile.update({
      where: { id: aff.id },
      data: { totalReferrals: { increment: 1 } },
    }),
  ]);
}

export async function recordAffiliateWager(userId: string, betAmount: number) {
  if (betAmount <= 0) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  });
  if (!user?.referredById) return;

  const aff = await prisma.affiliateProfile.findUnique({
    where: { userId: user.referredById },
  });
  if (!aff || !aff.active) return;

  const commission =
    Math.floor(betAmount * Number(aff.commissionRate) * 100) / 100;

  await prisma.affiliateProfile.update({
    where: { id: aff.id },
    data: {
      totalWagered: { increment: betAmount },
      totalCommission: { increment: commission },
    },
  });
}
