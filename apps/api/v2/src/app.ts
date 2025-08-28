import "./instrument";

import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import type { ValidationError } from "@nestjs/common";
import { BadRequestException, ValidationPipe, VersioningType } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as cookieParser from "cookie-parser";
import { Request } from "express";
import helmet from "helmet";

import {
  API_VERSIONS,
  VERSION_2024_04_15,
  API_VERSIONS_ENUM,
  CAL_API_VERSION_HEADER,
  X_CAL_CLIENT_ID,
  X_CAL_SECRET_KEY,
  X_CAL_PLATFORM_EMBED,
} from "@calcom/platform-constants";

import { CalendarServiceExceptionFilter } from "./filters/calendar-service-exception.filter";
import { TRPCExceptionFilter } from "./filters/trpc-exception.filter";

export const bootstrap = (app: NestExpressApplication): NestExpressApplication => {
  app.enableShutdownHooks();

  app.enableVersioning({
    type: VersioningType.CUSTOM,
    extractor: (request: unknown) => {
      const headerVersion = (request as Request)?.headers[CAL_API_VERSION_HEADER] as string | undefined;
      if (headerVersion && API_VERSIONS.includes(headerVersion as API_VERSIONS_ENUM)) {
        return headerVersion;
      }
      return VERSION_2024_04_15;
    },
    defaultVersion: VERSION_2024_04_15,
  });

  app.use(helmet());

  app.enableCors({
    origin: "*",
    methods: ["GET", "PATCH", "DELETE", "HEAD", "POST", "PUT", "OPTIONS"],
    allowedHeaders: [
      X_CAL_CLIENT_ID,
      X_CAL_SECRET_KEY,
      X_CAL_PLATFORM_EMBED,
      CAL_API_VERSION_HEADER,
      "Accept",
      "Authorization",
      "Content-Type",
      "Origin",
    ],
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

  // Exception filters, new filters go at the bottom, keep the order
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalFilters(new ZodExceptionFilter());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new TRPCExceptionFilter());
  app.useGlobalFilters(new CalendarServiceExceptionFilter());

  app.use(cookieParser());

  if (process?.env?.API_GLOBAL_PREFIX) {
    app.setGlobalPrefix(process?.env?.API_GLOBAL_PREFIX);
  }

  return app;
};
