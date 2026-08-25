import { prisma } from "../utils/prisma";

function assertPositiveFinite(amount: number, label = "Amount") {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
  // 2 decimal places max for money
  if (Math.round(amount * 100) !== Math.round(amount * 1000) / 10 &&
      Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-9) {
    // allow normal floats that represent cents
  }
  const cents = Math.round(amount * 100);
  if (Math.abs(amount - cents / 100) > 1e-6) {
    throw new Error(`${label} must have at most 2 decimal places`);
  }
}

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  return Number(user.balance);
}

/**
 * Debit with row-level safety inside a transaction.
 * Optional idempotencyKey: if a transaction with same reference exists, return current balance.
 */
export async function debit(
  userId: string,
  amount: number,
  type: string,
  reference?: string,
  description?: string
): Promise<number> {
  assertPositiveFinite(amount);

  return prisma.$transaction(async (tx) => {
    if (reference) {
      const existing = await tx.transaction.findFirst({
        where: { userId, reference, type },
      });
      if (existing) {
        const u = await tx.user.findUnique({ where: { id: userId } });
        return Number(u?.balance ?? existing.balanceAfter);
      }
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const current = Number(user.balance);
    if (current < amount) throw new Error("Insufficient balance");

    const newBalance = Math.round((current - amount) * 100) / 100;

    await tx.user.update({
      where: { id: userId },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        userId,
        type,
        amount: -amount,
        balanceAfter: newBalance,
        reference,
        description,
      },
    });

    return newBalance;
  });
}

export async function credit(
  userId: string,
  amount: number,
  type: string,
  reference?: string,
  description?: string
): Promise<number> {
  assertPositiveFinite(amount);

  return prisma.$transaction(async (tx) => {
    if (reference) {
      const existing = await tx.transaction.findFirst({
        where: { userId, reference, type },
      });
      if (existing) {
        const u = await tx.user.findUnique({ where: { id: userId } });
        return Number(u?.balance ?? existing.balanceAfter);
      }
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const current = Number(user.balance);
    const newBalance = Math.round((current + amount) * 100) / 100;

    await tx.user.update({
      where: { id: userId },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        userId,
        type,
        amount,
        balanceAfter: newBalance,
        reference,
        description,
      },
    });

    return newBalance;
  });
}

export async function getTransactions(userId: string, limit = 50) {
  const take = Math.min(100, Math.max(1, limit));
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
