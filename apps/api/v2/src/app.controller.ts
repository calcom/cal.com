import { Controller, Get, VERSION_NEUTRAL, Version } from "@nestjs/common";
@Controller()
export class AppController {
  @Get("health")
  @Version(VERSION_NEUTRAL)
  getHealth(): "OK" {
    console.log("NODE_ENV", process.env.NODE_ENV);
    console.log("VERCEL_ENV", process.env.VERCEL_ENV);
    console.log("VERCEL", process.env.VERCEL);
    console.log("TRIGGER_VERSION", process.env.TRIGGER_VERSION);
    console.log("CALCOM_ENV", process.env.CALCOM_ENV);
    return "OK";
  }
}
