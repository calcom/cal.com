import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response } from "express";

@Injectable()
export class RedirectsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    if (process.env.DOCS_URL && (req.url.startsWith("/v2/docs") || req.url.startsWith("/docs"))) {
      return res.redirect(process.env.DOCS_URL);
    }
    next();
  }
}
