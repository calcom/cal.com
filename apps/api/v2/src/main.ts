import type { AppConfig } from "@/config/type";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import "dotenv/config";
import { WinstonModule } from "nest-winston";
import * as qs from "qs";

import { bootstrap } from "./bootstrap";
import { AppModule } from "./app.module";
import { loggerConfig } from "./lib/logger";
import { generateSwaggerForApp } from "./swagger/generate-swagger";

const logger = new Logger("App");

/**
 * CACHE: This allows the Nest app to persist across multiple
 * serverless "warm" invocations, significantly reducing latency.
 */
let cachedServer: any;

/**
 * LOCAL DEVELOPMENT
 * Only call run() if we are not in a Vercel/Production environment.
 */
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  run().catch((error: Error) => {
    console.error("Failed to start Cal Platform API", { error: error.stack });
    process.exit(1);
  });
}

async function run() {
  const app = await createNestApp();
  try {
    bootstrap(app);
    const configService = app.get(ConfigService<AppConfig, true>);
    const port = configService.get("api.port", { infer: true }) || 3000;

    generateSwaggerForApp(app);
    await app.listen(port);

    logger.log(`Application started locally on port: ${port}`);
  } catch (error) {
    logger.error("Application crashed during local startup", { error });
  }
}

/**
 * VERCEL SERVERLESS HANDLER
 * This is the entry point Vercel will call.
 */
export default async (req: any, res: any) => {
  if (!cachedServer) {
    try {
      const app = await createNestApp();
      bootstrap(app);

      // We initialize but DO NOT call .listen()
      await app.init();

      cachedServer = app.getHttpAdapter().getInstance();
    } catch (error) {
      console.error("Failed to initialize Nest app for Serverless", error);
      res.status(500).send("Internal Server Error during initialization");
      return;
    }
  }

  return cachedServer(req, res);
};

/**
 * SHARED NEST INSTANCE CREATION
 */
export async function createNestApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
    bodyParser: false, // Required if using webhooks or specific body parsers in bootstrap()
  });

  // Custom query parser to match Cal.com's requirements
  app.set("query parser", (str: string) => qs.parse(str, { arrayLimit: 1000 }));

  return app;
}
