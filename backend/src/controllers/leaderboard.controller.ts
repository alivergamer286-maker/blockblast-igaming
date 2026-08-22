import { Request, Response } from "express";
import * as leaderboardService from "../services/leaderboard.service";

export async function global(req: Request, res: Response) {
  try {
    const data = await leaderboardService.getGlobalLeaderboard();
    res.json({ leaderboard: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function daily(req: Request, res: Response) {
  try {
    const data = await leaderboardService.getDailyLeaderboard();
    res.json({ leaderboard: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function history(req: Request, res: Response) {
  try {
    const data = await leaderboardService.getUserHistory(req.user!.userId);
    res.json({ history: data });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
