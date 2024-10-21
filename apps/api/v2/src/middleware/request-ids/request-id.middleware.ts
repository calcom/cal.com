import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger("RequestIdMiddleware - NestMiddleware");

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuid();
    req.headers["X-Request-Id"] = requestId;
    const { method, url, headers, body: requestBody } = req;

    this.logger.log(
      JSON.stringify({
        requestId,
        method,
        url,
        headers,
        requestBody,
        timestamp: new Date().toISOString(),
        message: "Incoming Request",
      })
    );

    next();
  }
}
