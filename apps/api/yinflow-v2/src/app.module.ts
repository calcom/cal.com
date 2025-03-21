import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";

import { AppController } from "./app.controller";
import appConfig from "./config/app";
import { AppLoggerMiddleware } from "./middleware/app.logger.middleware";
import { RedirectsMiddleware } from "./middleware/app.redirects.middleware";
import { RewriterMiddleware } from "./middleware/app.rewrites.middleware";
import { JsonBodyMiddleware } from "./middleware/body/json.body.middleware";
import { RawBodyMiddleware } from "./middleware/body/raw.body.middleware";
import { ResponseInterceptor } from "./middleware/request-ids/request-id.interceptor";
import { RequestIdMiddleware } from "./middleware/request-ids/request-id.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { EndpointsModule } from "./modules/endpoints.module";
import { JwtModule } from "./modules/jwt/jwt.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { RedisModule } from "./modules/redis/redis.module";

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [appConfig],
    }),

    RedisModule,
    PrismaModule,
    EndpointsModule,
    AuthModule,
    JwtModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({
        path: "/api/v2/billing/webhook",
        method: RequestMethod.POST,
      })
      .apply(JsonBodyMiddleware)
      .forRoutes("*")
      .apply(RequestIdMiddleware)
      .forRoutes("*")
      .apply(AppLoggerMiddleware)
      .forRoutes("*")
      .apply(RedirectsMiddleware)
      .forRoutes("/")
      .apply(RewriterMiddleware)
      .forRoutes("/");
  }
}
