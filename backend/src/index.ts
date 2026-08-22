import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import routes from "./routes";
import { globalLimiter } from "./middleware/rateLimit";
import { connectRedis } from "./utils/redis";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(globalLimiter);
app.use("/api", routes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

async function main() {
  await connectRedis();
  app.listen(config.port, () => {
    console.log(`[Server] running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
