import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import routes from "./routes";
import { globalLimiter } from "./middleware/rateLimit";
import { connectRedis } from "./utils/redis";

const app = express();

console.log("[boot] process starting");
console.log("[boot] NODE_ENV=", process.env.NODE_ENV);
console.log("[boot] PORT env=", process.env.PORT);
console.log("[boot] config.port=", config.port);
console.log("[boot] DATABASE_URL set=", Boolean(process.env.DATABASE_URL));
console.log("[boot] JWT_SECRET set=", Boolean(process.env.JWT_SECRET));

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(globalLimiter);

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "blockblast-api" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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
  console.log("[boot] main() entered");

  try {
    console.log("[boot] connecting redis (optional)...");
    await connectRedis();
    console.log("[boot] redis step done");
  } catch (err) {
    console.warn("[Redis] skipped:", (err as Error).message);
  }

  const port = Number(process.env.PORT) || config.port || 3000;
  console.log("[boot] about to listen on 0.0.0.0:" + port);

  const server = app.listen(port, "0.0.0.0", () => {
    console.log("[Server] listening on 0.0.0.0:" + port);
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
