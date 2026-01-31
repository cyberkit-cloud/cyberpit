import "dotenv/config";

import express from "express";
import type { Request, Response, NextFunction } from "express";
import { RequestLogger } from "./logger/RequestLogger.ts";
import dashboardRouter from "./routes/dashboard.ts";
import { createLogsRouter } from "./routes/logs.ts";

import { logEndpointGenerator } from "./routes/log.ts";
import { actEndpointGenerator } from "./routes/act.ts";

// Extend the Request interface to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      requestId?: string;
    }
  }
}

const managementApp = express();

const app = express();
const logger = new RequestLogger();

// Middleware to capture raw body for non-JSON (e.g., Stripe signature verification)
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.startsWith("application/json")) {
    express.json()(req, res, next);
  } else {
    let data = Buffer.alloc(0);
    req.on("data", (chunk) => {
      data = Buffer.concat([data, chunk]);
    });
    req.on("end", () => {
      req.rawBody = data;
      next();
    });
  }
});

// Logger middleware
app.use(logEndpointGenerator(logger));

// Act middleware
app.use(actEndpointGenerator(logger));

// Register dashboard and API routes
managementApp.use(dashboardRouter);
managementApp.use(createLogsRouter(logger));
if (process.env.UNSAFE_ENABLE_MANAGEMENT_ROUTES === "I_AM_AWARE_OF_THE_RISKS") {
  app.use("/unsafe_management", managementApp);
}

// Error handler middleware (must be last)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Google Cloud Functions Framework export
export const cyberpit = app;

export default cyberpit;

// Hack for Functions Framework... app has to be exported to open port, but we can do this
managementApp.listen(process.env.MANAGEMENT_SERVER_PORT || 9090, () => {
  console.log(
    `🛠️ Management app listening on port ${process.env.MANAGEMENT_SERVER_PORT || 9090}`,
  );
});
