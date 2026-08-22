import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwt: {
    secret: process.env.JWT_SECRET || "dev_secret_change_me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  initialBalance: parseFloat(process.env.INITIAL_BALANCE || "1000"),
  minBet: parseFloat(process.env.MIN_BET || "1"),
  maxBet: parseFloat(process.env.MAX_BET || "100"),
};
