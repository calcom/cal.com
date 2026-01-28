import "dotenv/config";

import { IncomingMessage, Server, ServerResponse } from "node:http";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Express, Request, Response } from "express";
import { WinstonModule } from "nest-winston";
import qs from "qs";
import { TRIGGER_VERSION } from "../trigger.version";
import { AppModule } from "./app.module";
import { bootstrap } from "./bootstrap";
import { loggerConfig } from "./lib/logger";
import type { AppConfig } from "@/config/type";

if (process.env.NODE_ENV === "production") {
  process.env.TRIGGER_VERSION = TRIGGER_VERSION;
}
const logger: Logger = new Logger("App");

/**
 * Singleton Class to manage the NestJS App instance.
 * Ensures we only initialize the app once per container lifecycle.
 */
class NestServer {
  private static server: Express; // The underlying Express instance

  private constructor() {}

  /**
   * Returns the cached server instance.
   * If it doesn't exist, it creates, bootstraps, and initializes it.
   */
  public static async getInstance(): Promise<Express> {
    if (!NestServer.server) {
      const app = await createNestApp();

      // Execute bootstrap (Pipes, Interceptors, CORS, etc.)
      bootstrap(app);

      // Initialize the app (connects to DB, resolves modules)
      await app.init();

      // extract the Express instance to pass to Vercel
      NestServer.server = app.getHttpAdapter().getInstance();
    }
    return NestServer.server;
  }
}

// -----------------------------------------------------------------------------
// LOCAL DEVELOPMENT STARTUP
// -----------------------------------------------------------------------------
if (!process.env.VERCEL) {
  run().catch((error: Error) => {
    logger.error("Failed to start Cal Platform API", { error: error.stack });
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

// -----------------------------------------------------------------------------
// VERCEL SERVERLESS HANDLER
// -----------------------------------------------------------------------------
export default async (req: Request, res: Response): Promise<void> => {
  try {
    const server = await NestServer.getInstance();

    // Vercel/AWS specific: Re-parse query strings to support array formats
    // (e.g., ?ids[]=1&ids[]=2) which Vercel's native parser might simplify.
    if (req.url) {
      const [_path, queryString] = req.url.split("?");
      if (queryString) {
        req.query = qs.parse(queryString, { arrayLimit: 1000 });
      }
    }

    // Delegate request to the cached Express instance
    return server(req, res);
  } catch (error) {
    logger.error("Critical: Failed to initialize NestJS Serverless instance", error);
    res.statusCode = 500;
    res.end("Internal Server Error: Initialization Failed");
  }
};

// -----------------------------------------------------------------------------
// APP FACTORY
// -----------------------------------------------------------------------------
export async function createNestApp(): Promise<
  NestExpressApplication<Server<typeof IncomingMessage, typeof ServerResponse>>
> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
    // Preserved as requested:
    bodyParser: false,
  });

  // Custom query parser configuration for the underlying Express app
  app.set("query parser", (str: string) => qs.parse(str, { arrayLimit: 1000 }));

  return app;
}
