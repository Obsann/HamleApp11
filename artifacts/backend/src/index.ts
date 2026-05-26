import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from the workspace root (../../../ from artifacts/backend/dist/)
const __dirname2 = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname2, "../../../.env") });

import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "@workspace/db";
import { seedIfEmpty } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

connectDB()
  .then(() => {
    logger.info("Connected to MongoDB");
    const server = app.listen(port, "0.0.0.0", () => {
      logger.info({ port }, "Server listening on 0.0.0.0");
      seedIfEmpty().catch((e) => logger.error({ err: e }, "Seed failed"));
    });
    server.on("error", (err) => {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });
