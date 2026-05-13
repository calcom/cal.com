/** Documents apps/api/v2/src/app.controller.ts module purpose and public usage context */
import { Controller, Get, VERSION_NEUTRAL, Version } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  @Version(VERSION_NEUTRAL)
  getHealth(): "OK" {
    return "OK";
  }
}
