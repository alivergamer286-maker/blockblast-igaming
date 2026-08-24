import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

export async function adminMiddleware(
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
    select: { role: true, status: true },
  });

  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  if (user.status !== "active") {
    res.status(403).json({ error: "Account not active" });
    return;
  }

  next();
}
