import dotenv from "dotenv";
dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`[config] Missing required env: ${name}`);
  }
  return v.trim();
}

function loadJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error(
        "[config] JWT_SECRET must be set and at least 32 characters in production"
      );
    }
    if (secret === "dev_secret_change_me" || secret.length < 32) {
      throw new Error("[config] JWT_SECRET is weak; refuse to start in production");
    }
    return secret;
  }
  return secret || "dev_secret_change_me_not_for_production_use_only";
}

if (isProd && !process.env.DATABASE_URL) {
  throw new Error("[config] DATABASE_URL is required in production");
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv,
  isProd,
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  jwt: {
    secret: loadJwtSecret(),
    /** access token TTL in seconds */
    expiresInSec: parseInt(process.env.JWT_EXPIRES_IN_SEC || "3600", 10), // 1h
  },
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  initialBalance: parseFloat(process.env.INITIAL_BALANCE || "1000"),
  minBet: parseFloat(process.env.MIN_BET || "1"),
  maxBet: parseFloat(process.env.MAX_BET || "100"),
  /** max absolute amount admin can credit/debit in one call */
  maxAdminAdjust: parseFloat(process.env.MAX_ADMIN_ADJUST || "10000"),
  /** max pending withdrawal amount per request */
  maxWithdrawal: parseFloat(process.env.MAX_WITHDRAWAL || "5000"),
};

// fail-fast export check
void requireEnv;
