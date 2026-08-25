import { prisma } from "../utils/prisma";
import { writeAudit } from "./audit.service";
import { config } from "../config";

export async function listUsers(page = 1, limit = 20, search?: string) {
  const skip = (page - 1) * limit;
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { username: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        balance: true,
        role: true,
        status: true,
        banReason: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map((u) => ({ ...u, balance: Number(u.balance) })),
    total,
    page,
    limit,
  };
}

export async function setUserStatus(
  adminId: string,
  userId: string,
  status: "active" | "banned" | "suspended",
  banReason?: string,
  ip?: string
) {
  if (adminId === userId && status !== "active") {
    throw new Error("Cannot ban/suspend yourself");
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found");
  if (target.role === "admin" && status === "banned") {
    throw new Error("Cannot ban another admin");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      banReason: status === "banned" ? banReason || null : null,
    },
  });

  await writeAudit({
    actorId: adminId,
    action: `user.${status}`,
    targetType: "user",
    targetId: userId,
    meta: { banReason },
    ip,
  });

  return user;
}

export async function adjustBalance(
  adminId: string,
  userId: string,
  amount: number,
  reason: string,
  ip?: string,
  idempotencyKey?: string
) {
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Invalid amount");
  }
  if (Math.abs(amount) > config.maxAdminAdjust) {
    throw new Error(`Amount exceeds max admin adjust (${config.maxAdminAdjust})`);
  }
  if (!reason || reason.trim().length < 3) {
    throw new Error("Reason required (min 3 chars)");
  }

  const reference =
    idempotencyKey ||
    `admin:${adminId}:${userId}:${amount}:${reason}`.slice(0, 120);

  const result = await prisma.$transaction(async (tx) => {
    const dup = await tx.transaction.findFirst({
      where: { reference, userId },
    });
    if (dup) {
      return Number(dup.balanceAfter);
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const current = Number(user.balance);
    const next = Math.round((current + amount) * 100) / 100;
    if (next < 0) throw new Error("Balance would be negative");

    await tx.user.update({
      where: { id: userId },
      data: { balance: next },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: amount > 0 ? "admin_credit" : "admin_debit",
        amount,
        balanceAfter: next,
        description: reason.trim(),
        reference,
      },
    });

    return next;
  });

  await writeAudit({
    actorId: adminId,
    action: "wallet.adjust",
    targetType: "user",
    targetId: userId,
    meta: { amount, reason: reason.trim(), reference },
    ip,
  });

  return { balance: result };
}

export async function dashboardStats() {
  const [users, activeSessions, totalBets, pendingWithdrawals] = await Promise.all([
    prisma.user.count(),
    prisma.gameSession.count({ where: { status: "active" } }),
    prisma.transaction.aggregate({
      where: { type: "bet" },
      _sum: { amount: true },
    }),
    prisma.withdrawalRequest.count({ where: { status: "pending" } }),
  ]);

  return {
    users,
    activeSessions,
    totalBetVolume: Math.abs(Number(totalBets._sum.amount || 0)),
    pendingWithdrawals,
  };
}

export async function listAudit(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { username: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);
  return { items, total, page, limit };
}

export async function listWithdrawals(status?: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true, email: true } },
      },
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);
  return {
    items: items.map((w) => ({ ...w, amount: Number(w.amount) })),
    total,
    page,
    limit,
  };
}

export async function reviewWithdrawal(
  adminId: string,
  id: string,
  status: "approved" | "rejected" | "paid",
  note?: string,
  ip?: string
) {
  const current = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!current) throw new Error("Withdrawal not found");

  // prevent double-pay / illegal transitions
  if (current.status === "paid") {
    throw new Error("Already paid");
  }
  if (current.status === "rejected" && status !== "rejected") {
    throw new Error("Cannot change rejected withdrawal");
  }
  if (status === "paid" && current.status !== "approved") {
    throw new Error("Only approved withdrawals can be marked paid");
  }

  const w = await prisma.withdrawalRequest.update({
    where: { id },
    data: {
      status,
      note,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: adminId,
    action: `withdrawal.${status}`,
    targetType: "withdrawal",
    targetId: id,
    meta: { note, previousStatus: current.status },
    ip,
  });

  return w;
}
