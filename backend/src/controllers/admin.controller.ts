import { Request, Response } from "express";
import { z } from "zod";
import * as adminService from "../services/admin.service";
import * as affiliateService from "../services/affiliate.service";
import * as platformService from "../services/platform.service";
import * as eventService from "../services/event.service";
import { prisma } from "../utils/prisma";
import { writeAudit } from "../services/audit.service";

function clientIp(req: Request): string | undefined {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") return xf.split(",")[0].trim();
  return req.socket.remoteAddress;
}

async function assertOwner(adminId: string) {
  const settings = await platformService.getPlatformSettings();
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new Error("Admin not found");
  const ownerEmail = (settings.ownerEmail || process.env.OWNER_EMAIL || "")
    .toLowerCase()
    .trim();
  if (!ownerEmail || admin.email.toLowerCase() !== ownerEmail) {
    throw new Error("Somente o dono da plataforma pode fazer isso");
  }
}

export async function stats(_req: Request, res: Response) {
  try {
    res.json(await adminService.dashboardStats());
  } catch {
    res.status(500).json({ error: "Error" });
  }
}

export async function users(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    res.json(await adminService.listUsers(page, limit, search));
  } catch {
    res.status(500).json({ error: "Error" });
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

export async function setUserEconomy(req: Request, res: Response) {
  try {
    const schema = z.object({
      playerReturnPct: z.number().min(0).max(500).nullable().optional(),
      engagementMode: z.enum(["off", "auto", "force_hook", "force_tight"]).optional(),
    });
    const body = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(body.playerReturnPct !== undefined
          ? { playerReturnPct: body.playerReturnPct }
          : {}),
        ...(body.engagementMode !== undefined
          ? { engagementMode: body.engagementMode }
          : {}),
      },
    });
    await writeAudit({
      actorId: req.user!.userId,
      action: "user.economy",
      targetType: "user",
      targetId: user.id,
      meta: body,
      ip: clientIp(req),
    });
    res.json({
      id: user.id,
      playerReturnPct:
        user.playerReturnPct != null ? Number(user.playerReturnPct) : null,
      engagementMode: user.engagementMode,
      gamesPlayed: user.gamesPlayed,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** Only platform owner can grant/revoke admin */
export async function setUserRole(req: Request, res: Response) {
  try {
    await assertOwner(req.user!.userId);
    const schema = z.object({
      role: z.enum(["user", "admin", "affiliate"]),
    });
    const body = schema.parse(req.body);
    if (req.params.id === req.user!.userId && body.role !== "admin") {
      throw new Error("Não pode remover o próprio admin");
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: body.role },
    });
    await writeAudit({
      actorId: req.user!.userId,
      action: "user.role",
      targetType: "user",
      targetId: user.id,
      meta: { role: body.role },
      ip: clientIp(req),
    });
    res.json({ id: user.id, role: user.role });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function audit(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    res.json(await adminService.listAudit(page, limit));
  } catch {
    res.status(500).json({ error: "Error" });
  }
}

export async function withdrawals(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.json(await adminService.listWithdrawals(status, page, limit));
  } catch {
    res.status(500).json({ error: "Error" });
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
  } catch {
    res.status(500).json({ error: "Error" });
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
  } catch {
    res.status(500).json({ error: "Error" });
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
      returnCap: z.number().min(0).max(100).optional(),
      playerReturnPct: z.number().min(0).max(500).optional(),
      engagementEnabled: z.boolean().optional(),
      engagementHookGames: z.number().int().min(0).max(1000).optional(),
      engagementHookPct: z.number().min(0).max(500).optional(),
      engagementTightPct: z.number().min(0).max(500).optional(),
      winRatePct: z.number().min(0).max(100).optional(),
      housePool: z.number().min(0).optional(),
    });
    const body = schema.parse(req.body);
    res.json(await platformService.updatePlatformSettings(body));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function events(_req: Request, res: Response) {
  try {
    res.json({ items: await eventService.listEvents() });
  } catch {
    res.status(500).json({ error: "Error" });
  }
}

export async function createEvent(req: Request, res: Response) {
  try {
    const schema = z.object({
      title: z.string().min(2).max(120),
      description: z.string().max(500).optional(),
      multiplier: z.number().min(1).max(10),
      startsAt: z.string(),
      endsAt: z.string(),
      active: z.boolean().optional(),
    });
    const body = schema.parse(req.body);
    res.status(201).json(
      await eventService.createEvent(req.user!.userId, body, clientIp(req))
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateEvent(req: Request, res: Response) {
  try {
    const schema = z.object({
      title: z.string().min(2).max(120).optional(),
      description: z.string().max(500).optional(),
      multiplier: z.number().min(1).max(10).optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      active: z.boolean().optional(),
    });
    const body = schema.parse(req.body);
    res.json(
      await eventService.updateEvent(req.user!.userId, req.params.id, body, clientIp(req))
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteEvent(req: Request, res: Response) {
  try {
    res.json(await eventService.deleteEvent(req.user!.userId, req.params.id, clientIp(req)));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
