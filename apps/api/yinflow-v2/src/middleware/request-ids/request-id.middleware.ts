import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

import { filterReqHeaders } from "../../lib/filterReqHeaders";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger("RequestIdMiddleware - NestMiddleware");

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuid();
    req.headers["X-Request-Id"] = requestId;
    const { method, headers, body: requestBody, baseUrl } = req;

    this.logger.log("Incoming Request", {
      requestId,
      method,
      url: baseUrl,
      headers: filterReqHeaders(headers),
      requestBody,
      timestamp: new Date().toISOString(),
    });

    next();
  }
}
