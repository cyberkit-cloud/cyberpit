import * as fs from "fs/promises";
import * as path from "path";

export interface LoggedRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, any>;
  query: any;
  body: any;
  rawBody: string;
  status?: "pending" | "success" | "warning" | "error";
  response?: {
    status: number;
    timestamp: number;
    duration: number;
    body?: any;
  };
  fanoutResults?: Array<{
    url: string;
    ms: number;
    response: {
      headers?: Record<string, string>;
      status?: number;
      body?: string;
      error?: boolean;
      message?: string;
    };
  }>;
}

export class RequestLogger {
  private requests: LoggedRequest[] = [];
  private maxRequests = 1000;
  private persistToFile = process.env.PERSIST_LOGS === "true";
  private persistenceDir = process.env.LOGS_DIR || "./logs";

  constructor() {
    if (this.persistToFile) {
      this.ensureLogDirectory();
    }
  }

  private async ensureLogDirectory() {
    try {
      await fs.mkdir(this.persistenceDir, { recursive: true });
    } catch (error) {
      console.error("Error creating log directory:", error);
    }
  }

  async log(request: LoggedRequest) {
    // Add to memory (circular buffer)
    this.requests.unshift(request);
    if (this.requests.length > this.maxRequests) {
      this.requests.pop();
    }

    // Optionally persist to file
    if (this.persistToFile) {
      try {
        const filename = `${request.id}.json`;
        const filepath = path.join(this.persistenceDir, filename);
        await fs.writeFile(filepath, JSON.stringify(request, null, 2));
      } catch (error) {
        console.error("Error persisting log to file:", error);
      }
    }
  }

  getAll(limit = 100, offset = 0): LoggedRequest[] {
    return this.requests.slice(offset, offset + limit);
  }

  getById(id: string): LoggedRequest | undefined {
    return this.requests.find((req) => req.id === id);
  }

  updateResponse(id: string, response: LoggedRequest["response"]) {
    const request = this.getById(id);
    if (request) {
      request.response = response;

      // Update file if persistence is enabled
      if (this.persistToFile) {
        const filename = `${id}.json`;
        const filepath = path.join(this.persistenceDir, filename);
        fs.writeFile(filepath, JSON.stringify(request, null, 2)).catch(
          (err) => {
            console.error("Error updating persisted log:", err);
          },
        );
      }
    }
  }

  updateFanoutResults(
    id: string,
    fanoutResults: LoggedRequest["fanoutResults"],
  ) {
    const request = this.getById(id);
    if (request) {
      request.fanoutResults = fanoutResults;

      // Calculate status based on fanout results
      if (fanoutResults && fanoutResults.length > 0) {
        const successCount = fanoutResults.filter(
          (r) =>
            r.response?.status &&
            r.response.status >= 200 &&
            r.response.status < 300,
        ).length;

        if (successCount === fanoutResults.length) {
          request.status = "success";
        } else if (successCount === 0) {
          request.status = "error";
        } else {
          request.status = "warning";
        }
      }

      // Update file if persistence is enabled
      if (this.persistToFile) {
        const filename = `${id}.json`;
        const filepath = path.join(this.persistenceDir, filename);
        fs.writeFile(filepath, JSON.stringify(request, null, 2)).catch(
          (err) => {
            console.error("Error updating persisted log:", err);
          },
        );
      }
    }
  }

  getCount(): number {
    return this.requests.length;
  }

  clear() {
    this.requests = [];
  }
}
