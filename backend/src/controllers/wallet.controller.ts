import { Request, Response } from "express";
import { z } from "zod";
import * as walletService from "../services/wallet.service";
import { prisma } from "../utils/prisma";
import { assertCpfAvailable, normalizeCpf } from "../utils/cpf";
import { adjustHousePool, getPlatformSettings } from "../services/platform.service";
import { writeAudit } from "../services/audit.service";

export async function getBalance(req: Request, res: Response) {
  try {
    const balance = await walletService.getBalance(req.user!.userId);
    res.json({ balance });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getTransactions(req: Request, res: Response) {
  try {
    const items = await walletService.getTransactions(req.user!.userId);
    res.json({
      items: items.map((t) => ({
        ...t,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
      })),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function requestWithdraw(req: Request, res: Response) {
  try {
    const schema = z.object({
      amount: z.number().positive(),
      cpf: z.string().min(11),
      fullName: z.string().min(3).max(120),
      pixKey: z.string().min(3).max(120),
    });
    const body = schema.parse(req.body);
    const userId = req.user!.userId;

    const digits = await assertCpfAvailable(prisma, body.cpf, userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // bind CPF to account if empty; if different CPF already set — reject
    if (user.cpf && user.cpf !== digits) {
      throw new Error("CPF diferente do cadastrado nesta conta");
    }
    if (!user.cpf) {
      await prisma.user.update({
        where: { id: userId },
        data: { cpf: digits, cpfVerified: true } as any,
      });
    }

    const amount = Math.round(body.amount * 100) / 100;
    if (amount > Number(user.balance)) throw new Error("Saldo insuficiente");

    await walletService.debit(
      userId,
      amount,
      "withdraw_hold",
      `wdhold:${userId}:${Date.now()}`,
      "Withdrawal hold"
    );

    const w = await prisma.withdrawalRequest.create({
      data: {
        userId,
        amount,
        status: "pending",
        cpf: digits,
        fullName: body.fullName.trim(),
        pixKey: body.pixKey.trim(),
      },
    });

    res.status(201).json({ id: w.id, status: w.status, amount });
  } catch (err: any) {
    const msg = err.message || "Erro";
    res.status(400).json({ error: msg });
  }
}

/** Player deposit intent — requires unique CPF; credits only after admin or pool top-up path */
export async function requestDeposit(req: Request, res: Response) {
  try {
    const schema = z.object({
      amount: z.number().positive().max(50000),
      cpf: z.string().min(11),
    });
    const body = schema.parse(req.body);
    const userId = req.user!.userId;
    const digits = await assertCpfAvailable(prisma, body.cpf, userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    if (user.cpf && user.cpf !== digits) {
      throw new Error("CPF diferente do cadastrado nesta conta");
    }
    if (!user.cpf) {
      await prisma.user.update({
        where: { id: userId },
        data: { cpf: digits, cpfVerified: true } as any,
      });
    }

    // Without payment gateway: create pending note via audit; admin credits later.
    // Optionally auto-credit in demo if DEPOSIT_AUTO=true
    const amount = Math.round(body.amount * 100) / 100;
    if (process.env.DEPOSIT_AUTO === "true") {
      await walletService.credit(
        userId,
        amount,
        "deposit",
        `dep:${userId}:${Date.now()}`,
        "Deposit"
      );
      await adjustHousePool(amount);
      res.status(201).json({ status: "credited", amount });
      return;
    }

    await writeAudit({
      actorId: userId,
      action: "deposit.request",
      targetType: "user",
      targetId: userId,
      meta: { amount, cpf: digits },
    });

    res.status(201).json({
      status: "pending",
      message: "Depósito registrado. Aguarde confirmação (gateway ainda não ligado).",
      amount,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Erro" });
  }
}

export async function bindCpf(req: Request, res: Response) {
  try {
    const schema = z.object({ cpf: z.string().min(11) });
    const body = schema.parse(req.body);
    const userId = req.user!.userId;
    const digits = await assertCpfAvailable(prisma, body.cpf, userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.cpf && user.cpf !== digits) {
      throw new Error("CPF em uso");
    }
    await prisma.user.update({
      where: { id: userId },
      data: { cpf: digits, cpfVerified: true } as any,
    });
    res.json({ ok: true, cpf: digits });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Erro" });
  }
}
