import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import * as gameController from "../controllers/game.controller";
import * as walletController from "../controllers/wallet.controller";
import * as leaderboardController from "../controllers/leaderboard.controller";
import { authMiddleware } from "../middleware/auth";
import { authLimiter, gameLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/auth/register", authLimiter, authController.register);
router.post("/auth/login", authLimiter, authController.login);

router.get("/wallet", authMiddleware, walletController.getBalance);
router.get("/wallet/transactions", authMiddleware, walletController.getTransactions);

router.post("/game/start", authMiddleware, gameLimiter, gameController.start);
router.post("/game/place", authMiddleware, gameLimiter, gameController.place);
router.post("/game/end", authMiddleware, gameLimiter, gameController.end);

router.get("/leaderboard", leaderboardController.global);
router.get("/leaderboard/daily", leaderboardController.daily);
router.get("/history", authMiddleware, leaderboardController.history);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
