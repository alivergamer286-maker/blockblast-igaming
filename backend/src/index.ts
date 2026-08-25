import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import routes from "./routes";
import { globalLimiter } from "./middleware/rateLimit";
import { connectRedis } from "./utils/redis";

const app = express();

// Trust proxy (Railway / reverse proxy) for rate-limit IP and secure cookies later
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: config.isProd ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
  })
);

app.use(express.json({ limit: "64kb" }));
app.use(globalLimiter);

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "blockblast-api" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: config.nodeEnv });
});

app.use("/api", routes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Error]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

async function main() {
  if (config.isProd) {
    console.log("[boot] production mode — JWT and DATABASE_URL validated at config load");
  }

  try {
    await connectRedis();
  } catch (err) {
    console.warn("[Redis] skipped:", (err as Error).message);
  }

  const port = Number(process.env.PORT) || config.port || 3000;

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] listening on 0.0.0.0:${port}`);
  });

  server.on("error", (err) => {
    console.error("[Server] listen error:", err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
