import { getEnv } from "@/env";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { SentryFilter } from "@/filters/sentry-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import type { ValidationError } from "@nestjs/common";
import { BadRequestException, RequestMethod, ValidationPipe, VersioningType } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as Sentry from "@sentry/node";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";

import { TRPCExceptionFilter } from "./filters/trpc-exception.filter";

export const bootstrap = (app: NestExpressApplication): NestExpressApplication => {
  app.enableShutdownHooks();
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: "v",
    defaultVersion: "1",
  });

  app.use(helmet());

  app.enableCors({
    origin: "*",
    methods: ["GET", "PATCH", "DELETE", "HEAD", "POST", "PUT", "OPTIONS"],
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

  if (process.env.SENTRY_DNS) {
    Sentry.init({
      dsn: getEnv("SENTRY_DNS"),
    });
  }

  // Exception filters, new filters go at the bottom, keep the order
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryFilter(httpAdapter));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalFilters(new ZodExceptionFilter());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new TRPCExceptionFilter());

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  app.use(cookieParser());

  return app;
};
