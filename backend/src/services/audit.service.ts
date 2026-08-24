import { prisma } from "../utils/prisma";

export async function writeAudit(params: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: unknown;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        meta: params.meta as object | undefined,
        ip: params.ip,
      },
    });
  } catch (err) {
    console.error("[Audit] failed:", (err as Error).message);
  }
}
