import { Request, Response } from "express";
import { z } from "zod";
import * as gameService from "../services/game.service";
import * as walletService from "../services/wallet.service";

const startSchema = z.object({
  betAmount: z.number().min(0).max(100).optional().default(0),
});

const placeSchema = z.object({
  sessionId: z.string().uuid(),
  pieceIndex: z.number().int().min(0).max(2),
  row: z.number().int().min(0).max(7),
  col: z.number().int().min(0).max(7),
});

const endSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function start(req: Request, res: Response) {
  try {
    const data = startSchema.parse(req.body);
    const result = await gameService.startSession(req.user!.userId, data.betAmount);
    const balance = await walletService.getBalance(req.user!.userId);
    res.json({ ...result, balance });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function place(req: Request, res: Response) {
  try {
    const data = placeSchema.parse(req.body);
    const result = await gameService.placePiece(
      req.user!.userId,
      data.sessionId,
      data.pieceIndex,
      data.row,
      data.col
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function end(req: Request, res: Response) {
  try {
    const data = endSchema.parse(req.body);
    const result = await gameService.endSession(req.user!.userId, data.sessionId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
