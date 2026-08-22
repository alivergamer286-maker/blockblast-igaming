import Redis from "ioredis";
import { config } from "../config";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[Redis] error:", err.message);
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log("[Redis] connected");
  } catch (err) {
    console.warn("[Redis] connection failed, continuing without cache:", (err as Error).message);
  }
}
