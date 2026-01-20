import { getConfig, defaultConfig } from "./../config.ts";
import type { RequestLogger } from "./../logger/RequestLogger.ts";

export const actEndpointGenerator =
  (logger: RequestLogger, isReplay: boolean = true) =>
  async (req, res) => {
    const data = getConfig();

    const { method, headers, query } = req;
    // Use req.body for JSON, req.rawBody for non-JSON
    const isJson = (headers["content-type"] || "").startsWith(
      "application/json",
    );
    const bodyToSend = req.rawBody; // isJson ? JSON.stringify(req.body) : req.rawBody;

    const headersToSend = { ...headers };

    // Remove 'host' header to avoid issues with some servers
    delete headersToSend["host"];
    // Remove 'content-length' header to let fetch set it correctly
    delete headersToSend["content-length"];

    // Ngrok stuff
    headersToSend["ngrok-skip-browser-warning"] = "I Shall Pass!";

    // Cyberpit stuff
    headersToSend["x-sent-by-cyberpit"] = "CyberPit";

    // Read the default configuration
    const endpointData = data?.default ?? defaultConfig.default;

    // Fire all requests in parallel
    console.log(
      `Fanning out to endpoints: ${endpointData.endpoints.join(", ")}`,
    );
    const toRequest = {
      method,
      headers: headersToSend,
      body: method === "POST" || method === "PUT" ? bodyToSend : undefined,
    };

    // Prepare all fetch promises with timing
    const fetchPromises = endpointData.endpoints.map(async (endpointToSend) => {
      const endpointToSendTrimmed = endpointToSend.trim();
      const endpoint = endpointToSendTrimmed.endsWith("*")
        ? `${endpointToSendTrimmed.slice(0, -1)}${req.originalUrl}`
        : endpointToSendTrimmed;
      const start = Date.now();
      console.log(
        `${start} - Sending ${method} request to ${endpoint} with body:`,
        bodyToSend,
        "and headersToSend:",
        headersToSend,
      );
      try {
        const response = await fetch(endpoint, toRequest);
        const textResponse = await response.text();
        const ms = Date.now() - start;
        console.log(`Response from ${endpoint}:`, response.status);
        console.log(`Response body from ${endpoint}:`, textResponse);
        return {
          url: endpoint,
          ...toRequest,
          ms,
          response: {
            headers: Object.fromEntries(response.headers.entries()),
            status: response.status,
            body: textResponse,
          },
        };
      } catch (error) {
        const ms = Date.now() - start;
        console.error(`Error sending request to ${endpoint}:`, error);
        return {
          url: endpoint,
          ...toRequest,
          ms,
          response: {
            error: true,
            message: error.message,
          },
        };
      }
    });

    if (endpointData.response === "INSTANT_200_OK") {
      // Fire and forget, don't wait for responses but log them when done
      Promise.all(fetchPromises)
        .then((results) => {
          if (req.requestId) {
            logger.updateFanoutResults(req.requestId, results);
          }
        })
        .catch((error) => {
          console.error("Error in fanout promises:", error);
        });
      return res.status(200).send("OK");
    } else if (endpointData.response === "COLLECTIVE_200_OK") {
      // Wait for all responses and return them
      const results = await Promise.all(fetchPromises);
      // Save fanout results to logger
      if (req.requestId) {
        logger.updateFanoutResults(req.requestId, results);
      }
      return res.status(200).json(results);
    } else if (endpointData.response === "ECHO_200_OK") {
      // Echo back the received payload with 200 OK
      return res.status(200).json({
        message: "Webhook received",
        //   user,
        //   endpointHash,
        method,
        headers,
        query,
        body: isJson ? req.body : req.rawBody?.toString("utf8"),
      });
    }

    res.sendStatus(200);
  };
