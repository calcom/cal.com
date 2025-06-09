import { getEnv } from "@/env";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response } from "express";

@Injectable()
export class RewriterMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    if (getEnv("REWRITE_API_V2_PREFIX", "1") === "1" && req.url.startsWith("/api/v2")) {
      req.url = req.url.replace("/api/v2", "/v2");
    }
    if (req.url.startsWith("/v2/ee")) {
      req.url = req.url.replace("/v2/ee", "/v2");
    }
    if (req.url.includes("reccuring")) {
      req.url = req.url.replace("reccuring", "recurring");
    }
    next();
  }
}
