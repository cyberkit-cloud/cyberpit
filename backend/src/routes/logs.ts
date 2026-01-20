import express, { Router } from "express";
import { RequestLogger } from "../logger/RequestLogger.ts";
import { actEndpointGenerator } from "./act.ts";
import { getConfig, setConfig } from "./../config.ts";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

import { createLog } from "./log.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createLogsRouter(logger: RequestLogger) {
  const router = Router();
  const data = getConfig();

  // Get all logs
  router.get("/api/logs", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    res.json({
      total: logger.getCount(),
      limit,
      offset,
      requests: logger.getAll(limit, offset),
    });
  });

  // Download all logs as JSON file (must be before :id route)
  router.get("/api/logs/download", (req, res) => {
    try {
      const allLogs = logger.getAll(10000, 0); // Get up to 10k logs
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="cyberpit-logs-${Date.now()}.json"`,
      );
      res.send(
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            total: logger.getCount(),
            logs: allLogs,
          },
          null,
          2,
        ),
      );
    } catch (error: any) {
      console.error("Error downloading logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload/import logs from JSON file (must be before :id route)
  router.post("/api/logs/upload", express.json(), (req, res) => {
    try {
      const importData = req.body;
      const logsToImport = importData.logs || [];

      let imported = 0;
      for (const log of logsToImport) {
        logger.log(log);
        imported++;
      }

      res.json({
        message: `Successfully imported ${imported} log entries`,
        imported,
        total: logger.getCount(),
      });
    } catch (error: any) {
      console.error("Error uploading logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific log by ID
  router.get("/api/logs/:id", (req, res) => {
    const request = logger.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(request);
  });

  // Replay a logged request
  router.post("/api/logs/:id/replay", async (req, res) => {
    const originalRequest = logger.getById(req.params.id);
    if (!originalRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    try {
      // Create mock request and response objects that mimic Express req/res
      const mockReq: any = {
        method: originalRequest.method,
        headers: originalRequest.headers,
        query: originalRequest.query,
        body: originalRequest.body,
        rawBody: originalRequest.rawBody
          ? Buffer.from(originalRequest.rawBody, "utf8")
          : Buffer.alloc(0),
        originalUrl: originalRequest.url,
        requestId: `replay-${Date.now()}-${originalRequest.id}`,
      };

      let responseData: any = null;
      let statusCode = 200;

      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        send: (data: any) => {
          responseData = data;
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          return mockRes;
        },
        sendStatus: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        setHeader: () => mockRes,
      };

      // Log the replayed request
      const replayedLog = {
        ...mockReq,
        id: mockReq.requestId,
        timestamp: Date.now(),
        status: "pending" as const,
      };

      await createLog(logger, `${replayedLog.id}`, mockReq);

      // Call the act endpoint generator
      const actHandler = actEndpointGenerator(logger, true);
      await actHandler(mockReq, mockRes);

      res.json({
        message: "Request replayed successfully",
        originalId: req.params.id,
        replayId: mockReq.requestId,
        status: statusCode,
        response: responseData,
      });
    } catch (error: any) {
      console.error("Error replaying request:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clear all logs
  router.delete("/api/logs", (req, res) => {
    logger.clear();
    res.json({ message: "Logs cleared successfully" });
  });

  // Get current configuration
  router.get("/api/config", (req, res) => {
    const data = getConfig();
    res.json(data);
  });

  // Update configuration
  router.put("/api/config", express.json(), (req, res) => {
    try {
      const newConfig = req.body;
      console.log("Updating configuration to:", newConfig, req.body);
      setConfig(newConfig);

      res.json({
        message: "Configuration updated successfully",
        config: data,
      });
    } catch (error: any) {
      console.error("Error updating configuration:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Download configuration as JSON file
  router.get("/api/config/download", (req, res) => {
    try {
      const config = getConfig();
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="cyberpit-config-${Date.now()}.json"`,
      );
      res.send(JSON.stringify(config, null, 2));
    } catch (error: any) {
      console.error("Error downloading configuration:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload/import configuration from JSON file
  router.post("/api/config/upload", express.json(), (req, res) => {
    try {
      const newConfig = req.body;
      setConfig(newConfig);
      res.json({
        message: "Configuration uploaded and applied successfully",
        config: getConfig(),
      });
    } catch (error: any) {
      console.error("Error uploading configuration:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get version from package.json
  router.get("/api/version", async (req, res) => {
    try {
      const packageJsonPath = path.join(__dirname, "../../package.json");
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
      res.json({
        name: packageJson.name,
        version: packageJson.version,
        description:
          packageJson.description || "CyberPit - Webhook Management Platform",
      });
    } catch (error: any) {
      console.error("Error reading version:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
