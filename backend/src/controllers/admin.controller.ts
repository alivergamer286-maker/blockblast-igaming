import { Request, Response } from "express";
import { z } from "zod";
import * as adminService from "../services/admin.service";
import * as affiliateService from "../services/affiliate.service";
import * as platformService from "../services/platform.service";

function clientIp(req: Request): string | undefined {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") return xf.split(",")[0].trim();
  return req.socket.remoteAddress;
}

export async function stats(_req: Request, res: Response) {
  try {
    res.json(await adminService.dashboardStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function users(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    res.json(await adminService.listUsers(page, limit, search));
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
    res.json({ id: user.id, status: user.status, banReason: user.banReason });
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
    res.json(
      await adminService.adjustBalance(
        req.user!.userId,
        req.params.id,
        body.amount,
        body.reason,
        clientIp(req)
      )
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function audit(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    res.json(await adminService.listAudit(page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function withdrawals(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.json(await adminService.listWithdrawals(status, page, limit));
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
    res.json(
      await adminService.reviewWithdrawal(
        req.user!.userId,
        req.params.id,
        body.status,
        body.note,
        clientIp(req)
      )
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function affiliates(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    res.json(await affiliateService.listAffiliates(page, 20));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createAffiliate(req: Request, res: Response) {
  try {
    const schema = z.object({
      userId: z.string().uuid().optional(),
      emailOrUsername: z.string().min(1).optional(),
      commissionRate: z.number().min(0).max(0.5).optional(),
      notes: z.string().max(500).optional(),
    });
    const body = schema.parse(req.body);
    res.status(201).json(
      await affiliateService.createAffiliate(req.user!.userId, body, clientIp(req))
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function affiliateDetail(req: Request, res: Response) {
  try {
    res.json(await affiliateService.getAffiliateDetail(req.params.userId));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getConfig(_req: Request, res: Response) {
  try {
    res.json(await platformService.getPlatformSettings());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateConfig(req: Request, res: Response) {
  try {
    const schema = z.object({
      houseEdge: z.number().min(0).max(0.5).optional(),
      pointsPerUnit: z.number().min(1).optional(),
      maxMultiplier: z.number().min(1).max(100).optional(),
      minBet: z.number().min(0).optional(),
      maxBet: z.number().min(0).optional(),
    });
    const body = schema.parse(req.body);
    res.json(await platformService.updatePlatformSettings(body));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
