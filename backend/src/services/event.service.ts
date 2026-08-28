import { prisma } from "../utils/prisma";
import { writeAudit } from "./audit.service";

export async function listEvents() {
  const items = await prisma.event.findMany({ orderBy: { startsAt: "desc" }, take: 50 });
  return items.map((e) => ({
    ...e,
    multiplier: Number(e.multiplier),
  }));
}

export async function createEvent(
  adminId: string,
  data: {
    title: string;
    description?: string;
    multiplier: number;
    startsAt: string;
    endsAt: string;
    active?: boolean;
  },
  ip?: string
) {
  const ev = await prisma.event.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim(),
      multiplier: data.multiplier,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      active: data.active !== false,
    },
  });
  await writeAudit({
    actorId: adminId,
    action: "event.create",
    targetType: "event",
    targetId: ev.id,
    meta: { title: ev.title, multiplier: data.multiplier },
    ip,
  });
  return { ...ev, multiplier: Number(ev.multiplier) };
}

export async function updateEvent(
  adminId: string,
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    multiplier: number;
    startsAt: string;
    endsAt: string;
    active: boolean;
  }>,
  ip?: string
) {
  const data: any = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.multiplier !== undefined) data.multiplier = patch.multiplier;
  if (patch.startsAt !== undefined) data.startsAt = new Date(patch.startsAt);
  if (patch.endsAt !== undefined) data.endsAt = new Date(patch.endsAt);
  if (patch.active !== undefined) data.active = patch.active;

  const ev = await prisma.event.update({ where: { id }, data });
  await writeAudit({
    actorId: adminId,
    action: "event.update",
    targetType: "event",
    targetId: id,
    meta: patch,
    ip,
  });
  return { ...ev, multiplier: Number(ev.multiplier) };
}

export async function deleteEvent(adminId: string, id: string, ip?: string) {
  await prisma.event.delete({ where: { id } });
  await writeAudit({
    actorId: adminId,
    action: "event.delete",
    targetType: "event",
    targetId: id,
    ip,
  });
  return { ok: true };
}
