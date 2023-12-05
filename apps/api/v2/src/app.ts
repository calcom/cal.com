import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { RequestMethod, VersioningType } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";

export const bootstrap = (app: NestExpressApplication): NestExpressApplication => {
  app.enableShutdownHooks();
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: "v",
    defaultVersion: "1",
  });

  app.enableCors({
    origin: "*",
    methods: ["GET", "HEAD", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Accept", "Authorization", "Content-Type", "Origin"],
    maxAge: 86_400,
  });

  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  return app;
};
