import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response } from "express";

@Injectable()
export class RewriterMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    console.log("REWIRTE MIDDLEWARE", req.url);
    if (req.url.startsWith("/api/v2")) {
      console.log("REWRITING URL");
      req.url = req.url.replace("/api/v2", "/v2");
    }
    if (req.url.startsWith("/v2/ee")) {
      console.log("REWRITING URL 2 ", req.url);
      req.url = req.url.replace("/v2/ee", "/v2");
    }
    console.log("REWRITING DONE ", req.url);
    next();
  }
}
