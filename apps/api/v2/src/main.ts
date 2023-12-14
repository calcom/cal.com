import type { AppConfig } from "@/config/type";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import "dotenv/config";
import { WinstonModule } from "nest-winston";

import { bootstrap } from "./app";
import { AppModule } from "./app.module";
import { loggerConfig } from "./lib/logger";

const run = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
  });
  const logger = new Logger("App");

  try {
    bootstrap(app);
    const port = app.get(ConfigService<AppConfig, true>).get("api.port", { infer: true });
    await app.listen(port);
    logger.log(`Application started on port: ${port}`);
  } catch (error) {
    logger.error("Application crashed", {
      error,
    });
  }
};

run().catch((error: Error) => {
  console.error("Failed to start Cal Platform API", { error: error.stack });
  process.exit(1);
});
