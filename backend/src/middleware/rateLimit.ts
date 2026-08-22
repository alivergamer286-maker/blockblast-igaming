import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down" },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts" },
});

export const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Game action rate limit exceeded" },
});
