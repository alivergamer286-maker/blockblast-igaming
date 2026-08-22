import { Request, Response } from "express";
import * as walletService from "../services/wallet.service";

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
