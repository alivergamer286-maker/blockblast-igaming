import { Request, Response } from "express";
import { z } from "zod";
import * as adminService from "../services/admin.service";

function clientIp(req: Request): string | undefined {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") return xf.split(",")[0].trim();
  return req.socket.remoteAddress;
}

export async function stats(req: Request, res: Response) {
  try {
    const data = await adminService.dashboardStats();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function users(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const data = await adminService.listUsers(page, limit, search);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function setStatus(req: Request, res: Response) {
  try {
    const schema = z.object({
      status: z.enum(["active", "banned", "suspended"]),
      banReason: z.string().max(500).optional(),
    });
    const body = schema.parse(req.body);
    const user = await adminService.setUserStatus(
      req.user!.userId,
      req.params.id,
      body.status,
      body.banReason,
      clientIp(req)
    );
    res.json({
      id: user.id,
      status: user.status,
      banReason: user.banReason,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function adjustBalance(req: Request, res: Response) {
  try {
    const schema = z.object({
      amount: z.number(),
      reason: z.string().min(3).max(200),
    });
    const body = schema.parse(req.body);
    const data = await adminService.adjustBalance(
      req.user!.userId,
      req.params.id,
      body.amount,
      body.reason,
      clientIp(req)
    );
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function audit(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const data = await adminService.listAudit(page, limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function withdrawals(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const data = await adminService.listWithdrawals(status, page, limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function reviewWithdrawal(req: Request, res: Response) {
  try {
    const schema = z.object({
      status: z.enum(["approved", "rejected", "paid"]),
      note: z.string().max(500).optional(),
    });
    const body = schema.parse(req.body);
    const w = await adminService.reviewWithdrawal(
      req.user!.userId,
      req.params.id,
      body.status,
      body.note,
      clientIp(req)
    );
    res.json(w);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
