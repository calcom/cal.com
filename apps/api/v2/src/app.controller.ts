import { Controller, Get, Version, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

@Controller()
@DocsTags("Check health")
export class AppController {
  @Get("health")
  @Version(VERSION_NEUTRAL)
  getHealth(): "OK" {
    return "OK";
  }
}
