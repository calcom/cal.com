import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
  OperationObject,
  PathItemObject,
  PathsObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import "dotenv/config";
import { WinstonModule } from "nest-winston";

import { bootstrap } from "./app";
import { AppModule } from "./app.module";
import type { AppConfig } from "./config/type";
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
  const groupedPaths: { [key: string]: PathsObject } = {};

  Object.keys(paths).forEach((pathKey) => {
    const pathItem = paths[pathKey];

    HttpMethods.forEach((method) => {
      const operation = pathItem[method];

      if (isOperationObject(operation) && operation.tags && operation.tags.length > 0) {
        const firstTag = operation.tags[0];

        if (!groupedPaths[firstTag]) {
          groupedPaths[firstTag] = {};
        }

        groupedPaths[firstTag][pathKey] = pathItem;
      }
    });
  });

  const sortedTags = Object.keys(groupedPaths).sort(customTagSort);
  const sortedPaths: PathsObject = {};

  sortedTags.forEach((tag) => {
    Object.assign(sortedPaths, groupedPaths[tag]);
  });

  return sortedPaths;
}

run().catch((error: Error) => {
  console.error("Failed to start Cal Platform API", { error: error.stack });
  process.exit(1);
});
