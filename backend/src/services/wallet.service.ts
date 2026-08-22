import { prisma } from "../utils/prisma";

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  return Number(user.balance);
}

export async function debit(
  userId: string,
  amount: number,
  type: string,
  reference?: string,
  description?: string
): Promise<number> {
  if (amount <= 0) throw new Error("Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const current = Number(user.balance);
    if (current < amount) throw new Error("Insufficient balance");

    const newBalance = current - amount;

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
  if (amount <= 0) throw new Error("Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const current = Number(user.balance);
    const newBalance = current + amount;

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
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
