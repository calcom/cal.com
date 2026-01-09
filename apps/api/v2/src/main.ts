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

const logger = new Logger("App");

let cachedServer: any;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  run().catch((error: Error) => {
    console.error("Failed to start Cal Platform API", { error: error.stack });
    process.exit(1);
  });
}

async function run(): Promise<void> {
  const app = await createNestApp();
  try {
    bootstrap(app);
    const config = app.get(ConfigService<AppConfig, true>);
    const port = config.get("api.port", { infer: true });

    if (config.get("env.type", { infer: true }) === "development") {
      const { generateSwaggerForApp } = await import("./swagger/generate-swagger");
      generateSwaggerForApp(app);
    }

    await app.listen(port);

    logger.log(`Application started locally on port: ${port}`);
  } catch (error) {
    logger.error("Application crashed during local startup", { error });
  }
}

// Vercel serverless handler
export default async (req: any, res: any) => {
  if (!cachedServer) {
    try {
      const app = await createNestApp();
      bootstrap(app);
      await app.init();
      cachedServer = app.getHttpAdapter().getInstance();
    } catch (error) {
      console.error("Failed to initialize Nest app for Serverless", error);
      res.status(500).send("Internal Server Error during initialization");
      return;
    }
  }

  // Vercel pre-parses req.query, re-parse to handle array params like 'routedTeamMemberIds[]'
  const urlParts = req.url.split("?");
  if (urlParts.length > 1) {
    req.query = qs.parse(urlParts[1], { arrayLimit: 1000, comma: true });
  }

  return cachedServer(req, res);
};

export async function createNestApp(): Promise<
  NestExpressApplication<Server<typeof IncomingMessage, typeof ServerResponse>>
> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
    bodyParser: false,
  });

  // Custom query parser for local/standard deployments
  app.set("query parser", (str: string) => qs.parse(str, { arrayLimit: 1000, comma: true }));

  return app;
}
