import type { Request, Response, NextFunction } from "express";
import type {
  RequestLogger,
  LoggedRequest,
} from "./../logger/RequestLogger.ts";

export const createLog = async (
  logger: RequestLogger,
  requestId: string,
  req: Request,
) => {
  const requestStartTime = Date.now();
  const { method, headers, query } = req;
  // Use req.body for JSON, req.rawBody for non-JSON
  const isJson = (headers["content-type"] || "").startsWith("application/json");
  const bodyToSend = req.rawBody; // isJson ? JSON.stringify(req.body) : req.rawBody;

  // Log the incoming request
  const loggedRequest: LoggedRequest = {
    id: requestId,
    timestamp: requestStartTime,
    method,
    url: req.originalUrl,
    headers: { ...headers },
    query: { ...query },
    body: isJson ? req.body : undefined,
    rawBody: req.rawBody?.toString("utf8") || "",
    status: "pending",
  };

  await logger.log(loggedRequest);
};

export const logEndpointGenerator =
  (logger: RequestLogger, isReplay: boolean = true) =>
  async (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await createLog(logger, requestId, req);

    // Attach request ID to request object for later use
    req.requestId = requestId;

    next();
  };
