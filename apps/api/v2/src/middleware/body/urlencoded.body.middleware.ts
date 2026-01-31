import { Injectable, NestMiddleware } from "@nestjs/common";
import { urlencoded } from "body-parser";
import type { Request, Response } from "express";

@Injectable()
export class UrlencodedBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => any): void {
    urlencoded({ extended: true })(req, res, next);
  }
}
