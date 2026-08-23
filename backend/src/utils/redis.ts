import Redis from "ioredis";
import { config } from "../config";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  return redis;
}

export async function connectRedis(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log("[Redis] REDIS_URL not set, skipping");
    return;
  }

  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redis.on("error", (err) => {
      console.error("[Redis] error:", err.message);
    });

    await Promise.race([
      redis.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2000)
      ),
    ]);
    console.log("[Redis] connected");
  } catch (err) {
    console.warn(
      "[Redis] connection failed, continuing without cache:",
      (err as Error).message
    );
    try {
      redis?.disconnect();
    } catch {
      /* ignore */
    }
    redis = null;
  }
}
