import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { extractIdFields } from "@/lib/extract-id-fields";
import { filterReqHeaders } from "@/lib/filterReqHeaders";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger("RequestIdMiddleware - NestMiddleware");

  use(req: Request, res: Response, next: NextFunction) {
    const vercelId = req.headers["x-vercel-id"] as string | undefined;
    const requestId = vercelId ?? uuid();
    req.headers["X-Request-Id"] = requestId;
    const { method, headers, body: requestBody, baseUrl } = req;
    let idFields = "{}";

    try {
      if (requestBody && typeof requestBody === "object") {
        idFields = JSON.stringify(extractIdFields(requestBody as Record<string, unknown>));
      }
    } catch (err) {
      this.logger.error("Could not parse request body");
    }

    this.logger.log("Incoming Request", {
      requestId,
      method,
      url: baseUrl,
      headers: filterReqHeaders(headers),
      requestBody: idFields,
      timestamp: new Date().toISOString(),
    });

    next();
  }
}
