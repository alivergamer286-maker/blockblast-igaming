import { Router, Request, Response } from "express";
import * as authController from "../controllers/auth.controller";
import * as gameController from "../controllers/game.controller";
import * as walletController from "../controllers/wallet.controller";
import * as leaderboardController from "../controllers/leaderboard.controller";
import * as adminController from "../controllers/admin.controller";
import * as affiliateService from "../services/affiliate.service";
import { authMiddleware } from "../middleware/auth";
import { activeUserMiddleware } from "../middleware/activeUser";
import { adminMiddleware } from "../middleware/admin";
import {
  authLimiter,
  gameLimiter,
  adminLimiter,
} from "../middleware/rateLimit";
import { prisma } from "../utils/prisma";

const router = Router();

const authed = [authMiddleware, activeUserMiddleware];
const ops = [authMiddleware, activeUserMiddleware, adminMiddleware, adminLimiter];

router.post("/auth/register", authLimiter, authController.register);
router.post("/auth/login", authLimiter, authController.login);
router.get("/auth/verify-email", authLimiter, authController.verifyEmail);
router.post("/auth/verify-email", authLimiter, authController.verifyEmail);
router.post("/auth/resend-verification", ...authed, authLimiter, authController.resendVerify);

router.get("/wallet", ...authed, walletController.getBalance);
router.get("/wallet/transactions", ...authed, walletController.getTransactions);
router.post("/wallet/withdraw", ...authed, walletController.requestWithdraw);

router.post("/game/start", ...authed, gameLimiter, gameController.start);
router.post("/game/place", ...authed, gameLimiter, gameController.place);
router.post("/game/end", ...authed, gameLimiter, gameController.end);

router.get("/leaderboard", leaderboardController.global);
router.get("/leaderboard/daily", leaderboardController.daily);
router.get("/history", ...authed, leaderboardController.history);

// Affiliate self-service
router.get("/partner/me", ...authed, async (req: Request, res: Response) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { role: true },
    });
    if (!u || (u.role !== "affiliate" && u.role !== "admin")) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const data = await affiliateService.getAffiliateDetail(req.user!.userId);
    res.json(data);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

router.get("/ops/stats", ...ops, adminController.stats);
router.get("/ops/users", ...ops, adminController.users);
router.patch("/ops/users/:id/status", ...ops, adminController.setStatus);
router.post("/ops/users/:id/balance", ...ops, adminController.adjustBalance);
router.get("/ops/audit", ...ops, adminController.audit);
router.get("/ops/withdrawals", ...ops, adminController.withdrawals);
router.patch("/ops/withdrawals/:id", ...ops, adminController.reviewWithdrawal);
router.get("/ops/affiliates", ...ops, adminController.affiliates);
router.post("/ops/affiliates", ...ops, adminController.createAffiliate);
router.get("/ops/affiliates/:userId", ...ops, adminController.affiliateDetail);
router.get("/ops/config", ...ops, adminController.getConfig);
router.patch("/ops/config", ...ops, adminController.updateConfig);

router.all("/admin/*", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});
router.all("/admin", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
