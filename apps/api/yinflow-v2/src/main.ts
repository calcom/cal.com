import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import { Server } from "http";
import { WinstonModule } from "nest-winston";

import { bootstrap } from "./app";
import { AppModule } from "./app.module";
import { loggerConfig } from "./lib/logger";

const API_PORT = process.env.API_PORT || "5555";

const run = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
    bodyParser: false,
  });

  const logger = new Logger("App");

  try {
    bootstrap(app);
    void generateSwagger(app);
    await app.listen(API_PORT);
    logger.log(`Application started on port: ${API_PORT}`);
  } catch (error) {
    console.error(error);
    logger.error("Application crashed", {
      error,
    });
  }
};

async function generateSwagger(app: NestExpressApplication<Server>) {
  const logger = new Logger("App");
  logger.log(`Generating Swagger documentation...\n`);

  const config = new DocumentBuilder().setTitle("Cal.com v2 API").build();

  const document = SwaggerModule.createDocument(app, config);

  const outputFile = "./swagger/documentation.json";

  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }

  // fs.writeFileSync(outputFile, JSON.stringify(document, null, 2), { encoding: "utf8" });
  // SwaggerModule.setup("docs", app, document, {
  //   customCss: ".swagger-ui .topbar { display: none }",
  // });

  logger.log(`Swagger documentation available in the "/docs" endpoint\n`);
}

run().catch((error: Error) => {
  console.error("Failed to start Cal Platform API", { error: error.stack });
  process.exit(1);
});
