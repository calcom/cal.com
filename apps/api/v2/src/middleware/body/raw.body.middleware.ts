import { Injectable, NestMiddleware } from "@nestjs/common";
import { raw } from "body-parser";
import type { Request, Response } from "express";

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => any): void {
    raw({ type: "*/*" })(req, res, next);
  }
}
