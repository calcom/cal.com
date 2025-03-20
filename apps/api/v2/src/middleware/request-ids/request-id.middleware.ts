import { filterReqHeaders } from "@/lib/filterReqHeaders";
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger("RequestIdMiddleware - NestMiddleware");

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuid();
    req.headers["X-Request-Id"] = requestId;
    const { method, headers, body: requestBody, baseUrl } = req;
    let jsonBodyString = "{}";

    try {
      if (requestBody && typeof requestBody === "object") {
        jsonBodyString = JSON.stringify(requestBody);
      }
    } catch (err) {
      this.logger.error("Could not parse request body");
    }

    this.logger.log("Incoming Request", {
      requestId,
      method,
      url: baseUrl,
      headers: filterReqHeaders(headers),
      requestBody: jsonBodyString,
      timestamp: new Date().toISOString(),
    });

    next();
  }
}
