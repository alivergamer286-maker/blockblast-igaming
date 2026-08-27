import { Request, Response } from "express";
import { z } from "zod";
import * as walletService from "../services/wallet.service";
import { prisma } from "../utils/prisma";
import { config } from "../config";

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function validCpf(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10], 10);
}

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
    const txs = await walletService.getTransactions(req.user!.userId);
    res.json({ transactions: txs });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function requestWithdraw(req: Request, res: Response) {
  try {
    const schema = z.object({
      amount: z.number().positive(),
      cpf: z.string().min(11).max(14),
      fullName: z.string().min(3).max(120),
      pixKey: z.string().min(3).max(120),
    });
    const body = schema.parse(req.body);
    const cpf = onlyDigits(body.cpf);
    if (!validCpf(cpf)) {
      res.status(400).json({ error: "Invalid CPF" });
      return;
    }
    if (body.amount > config.maxWithdrawal) {
      res.status(400).json({ error: `Max withdrawal is ${config.maxWithdrawal}` });
      return;
    }

    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(400).json({ error: "User not found" });
      return;
    }
    if (!user.emailVerified) {
      res.status(400).json({ error: "Verify email before withdrawing" });
      return;
    }

    await walletService.debit(
      userId,
      body.amount,
      "withdraw_hold",
      `wd:${userId}:${Date.now()}`,
      "Withdrawal hold"
    );

    if (!user.cpf) {
      await prisma.user.update({
        where: { id: userId },
        data: { cpf },
      });
    }

    const w = await prisma.withdrawalRequest.create({
      data: {
        userId,
        amount: body.amount,
        status: "pending",
        cpf,
        fullName: body.fullName.trim(),
        pixKey: body.pixKey.trim(),
      },
    });

    res.status(201).json({
      id: w.id,
      amount: Number(w.amount),
      status: w.status,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(400).json({ error: err.message });
  }
}
