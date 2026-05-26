import { Router, type IRouter } from "express";
import { mongoose } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    res.status(500).json({ status: "error", message: "Database is disconnected." });
    return;
  }
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
