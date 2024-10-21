import type { AppConfig } from "@/config/type";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import {
  PathItemObject,
  PathsObject,
  OperationObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import "dotenv/config";
import * as fs from "fs";
import { Server } from "http";
import { WinstonModule } from "nest-winston";

import { bootstrap } from "./app";
import { AppModule } from "./app.module";
import { loggerConfig } from "./lib/logger";

const HttpMethods: (keyof PathItemObject)[] = ["get", "post", "put", "delete", "patch", "options", "head"];

const run = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig()),
    bodyParser: false,
  });

  const logger = new Logger("App");

  try {
    bootstrap(app);
    const port = app.get(ConfigService<AppConfig, true>).get("api.port", { infer: true });
    await generateSwagger(app);
    await app.listen(port);
    logger.log(`Application started on port: ${port}`);
  } catch (error) {
    console.error(error);
    logger.error("Application crashed", {
      error,
    });
  }
};

function customTagSort(a: string, b: string): number {
  const platformPrefix = "Platform";
  const orgsPrefix = "Orgs";

  if (a.startsWith(platformPrefix) && !b.startsWith(platformPrefix)) {
    return -1;
  }
  if (!a.startsWith(platformPrefix) && b.startsWith(platformPrefix)) {
    return 1;
  }

  if (a.startsWith(orgsPrefix) && !b.startsWith(orgsPrefix)) {
    return -1;
  }
  if (!a.startsWith(orgsPrefix) && b.startsWith(orgsPrefix)) {
    return 1;
  }

  return a.localeCompare(b);
}

function isOperationObject(obj: any): obj is OperationObject {
  return obj && typeof obj === "object" && "tags" in obj;
}

function groupAndSortPathsByFirstTag(paths: PathsObject): PathsObject {
  const groupedPaths = new Map<string, PathsObject>();

  Object.entries(paths).forEach(([pathKey, pathItem]) => {
    HttpMethods.forEach((method) => {
      const operation = pathItem[method];

      if (isOperationObject(operation) && operation.tags && operation.tags.length > 0) {
        const firstTag = operation.tags[0];

        if (!groupedPaths.has(firstTag)) {
          groupedPaths.set(firstTag, {});
        }

        const tagPaths = groupedPaths.get(firstTag);
        if (tagPaths) {
          tagPaths[pathKey] = pathItem;
        }
      }
    });
  });

  const sortedPaths: PathsObject = {};

  Array.from(groupedPaths.keys())
    .sort(customTagSort)
    .forEach((tag) => {
      const tagPaths = groupedPaths.get(tag);
      if (tagPaths) {
        Object.assign(sortedPaths, tagPaths);
      }
    });

  return sortedPaths;
}

async function generateSwagger(app: NestExpressApplication<Server>) {
  const logger = new Logger("App");
  logger.log(`Generating Swagger documentation...\n`);

  const config = new DocumentBuilder().setTitle("Cal.com API v2").build();
  const document = SwaggerModule.createDocument(app, config);
  document.paths = groupAndSortPathsByFirstTag(document.paths);

  const outputFile = "./swagger/documentation.json";

  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }

  fs.writeFileSync(outputFile, JSON.stringify(document, null, 2), { encoding: "utf8" });

  if (!process.env.DOCS_URL) {
    SwaggerModule.setup("docs", app, document, {
      customCss: ".swagger-ui .topbar { display: none }",
    });

    logger.log(`Swagger documentation available in the "/docs" endpoint\n`);
  }
}

run().catch((error: Error) => {
  console.error("Failed to start Cal Platform API", { error: error.stack });
  process.exit(1);
});
