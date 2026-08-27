import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

/** Respond 404 so ops surface is not advertised */
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { role: true, status: true },
  });

  if (!user || user.role !== "admin" || user.status !== "active") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  next();
}
