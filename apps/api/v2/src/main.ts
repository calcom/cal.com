import "dotenv/config";

import { IncomingMessage, Server, ServerResponse } from "node:http";
import process from "node:process";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { WinstonModule } from "nest-winston";
import * as qs from "qs";

import type { AppConfig } from "@/config/type";

import { AppModule } from "./app.module";
import { bootstrap } from "./bootstrap";
import { loggerConfig } from "./lib/logger";

run().catch((error: Error) => {
  console.error("Failed to start Cal Platform API", { error: error.stack });
  process.exit(1);
});

async function run(): Promise<void> {
  const app = await createNestApp();
  const logger = new Logger("App");

  try {
    bootstrap(app);
    const config = app.get(ConfigService<AppConfig, true>);
    const port = config.get("api.port", { infer: true });

    if (config.get("env.type", { infer: true }) === "development") {
      const { generateSwaggerForApp } = await import("./swagger/generate-swagger");
      generateSwaggerForApp(app);
    }

    await app.listen(port);
    logger.log(`Application started on port: ${port}`);
  } catch (error) {
    console.error(error);
    logger.error("Application crashed", {
      error,
    });
  }
}

export async function createNestApp(): Promise<
  NestExpressApplication<Server<typeof IncomingMessage, typeof ServerResponse>>
> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
    bodyParser: false,
  });

  app.set("query parser", (str: string) => qs.parse(str, { arrayLimit: 1000 }));

  return app;
}
