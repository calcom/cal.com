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

const logger = new Logger("App");

let cachedServer: any;

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

    await app.listen(port);

    logger.log(`Application started locally on port: ${port}`);
  } catch (error) {
    logger.error("Application crashed during local startup", { error });
  }
}

/**
 * VERCEL SERVERLESS HANDLER
 */
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

  /**
   * FIX: Vercel pre-parses req.query.
   * We force a re-parse of the raw query string using 'qs' to ensure
   * that 'routedTeamMemberIds[]' is correctly mapped to 'routedTeamMemberIds' as an array.
   */
  const urlParts = req.url.split("?");
  if (urlParts.length > 1) {
    req.query = qs.parse(urlParts[1], { arrayLimit: 1000, comma: true });
  }

  return cachedServer(req, res);
};

/**
 * SHARED NEST INSTANCE CREATION
 */
export async function createNestApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
    bodyParser: false,
  });

  // Custom query parser for local/standard deployments
  app.set("query parser", (str: string) => qs.parse(str, { arrayLimit: 1000, comma: true }));

  return app;
}
