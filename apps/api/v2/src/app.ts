import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import {
  BadRequestException,
  RequestMethod,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      validationError: {
        target: true,
        value: true,
      },
      exceptionFactory(errors: ValidationError[]) {
        return new BadRequestException({ errors });
      },
    })
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  return app;
};
