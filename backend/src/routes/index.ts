import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import * as gameController from "../controllers/game.controller";
import * as walletController from "../controllers/wallet.controller";
import * as leaderboardController from "../controllers/leaderboard.controller";
import * as adminController from "../controllers/admin.controller";
import { authMiddleware } from "../middleware/auth";
import { activeUserMiddleware } from "../middleware/activeUser";
import { adminMiddleware } from "../middleware/admin";
import {
  authLimiter,
  gameLimiter,
  adminLimiter,
} from "../middleware/rateLimit";

const router = Router();

const authed = [authMiddleware, activeUserMiddleware];
const admin = [authMiddleware, activeUserMiddleware, adminMiddleware, adminLimiter];

router.post("/auth/register", authLimiter, authController.register);
router.post("/auth/login", authLimiter, authController.login);
router.get("/auth/verify-email", authLimiter, authController.verifyEmail);
router.post("/auth/verify-email", authLimiter, authController.verifyEmail);
router.post("/auth/resend-verification", ...authed, authLimiter, authController.resendVerify);

router.get("/wallet", ...authed, walletController.getBalance);
router.get("/wallet/transactions", ...authed, walletController.getTransactions);

router.post("/game/start", ...authed, gameLimiter, gameController.start);
router.post("/game/place", ...authed, gameLimiter, gameController.place);
router.post("/game/end", ...authed, gameLimiter, gameController.end);

router.get("/leaderboard", leaderboardController.global);
router.get("/leaderboard/daily", leaderboardController.daily);
router.get("/history", ...authed, leaderboardController.history);

router.get("/admin/stats", ...admin, adminController.stats);
router.get("/admin/users", ...admin, adminController.users);
router.patch("/admin/users/:id/status", ...admin, adminController.setStatus);
router.post("/admin/users/:id/balance", ...admin, adminController.adjustBalance);
router.get("/admin/audit", ...admin, adminController.audit);
router.get("/admin/withdrawals", ...admin, adminController.withdrawals);
router.patch("/admin/withdrawals/:id", ...admin, adminController.reviewWithdrawal);
router.get("/admin/affiliates", ...admin, adminController.affiliates);
router.post("/admin/affiliates", ...admin, adminController.createAffiliate);
router.get("/admin/affiliates/:userId", ...admin, adminController.affiliateDetail);
router.get("/admin/config", ...admin, adminController.getConfig);
router.patch("/admin/config", ...admin, adminController.updateConfig);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
