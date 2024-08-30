import { Controller, Get, Version, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { getEnv } from "src/env";

@Controller()
@DocsTags("Health - development only")
@DocsExcludeController(getEnv("NODE_ENV") === "production")
export class AppController {
  @Get("health")
  @Version(VERSION_NEUTRAL)
  getHealth(): "OK" {
    return "OK";
  }
}
