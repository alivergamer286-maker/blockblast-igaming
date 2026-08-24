import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

/** Block banned/suspended users after JWT is valid */
export async function activeUserMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { status: true, banReason: true },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (user.status === "banned") {
    res.status(403).json({
      error: "Account banned",
      reason: user.banReason || undefined,
    });
    return;
  }

  if (user.status === "suspended") {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  next();
}
