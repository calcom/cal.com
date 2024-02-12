import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import "dotenv/config";
import { WinstonModule } from "nest-winston";

import { AppModule } from "./src/app.module";
import { loggerConfig } from "./src/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

const generateOpenAPI = async () => {
  const logger = new Logger("App");
  logger.log(`Generating OpenAPI documentation...\n`);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
  });

  const config = new DocumentBuilder().setTitle("Cal.com v2 API").build();

  const document = SwaggerModule.createDocument(app, config);
  const outputFile = "./openapi.json";
  fs.writeFileSync(outputFile, JSON.stringify(document, null, 2), { encoding: "utf8" });

  logger.log(`OpenAPI documentation generated in ${outputFile}\n`);
  process.exit(0);
};

generateOpenAPI();
