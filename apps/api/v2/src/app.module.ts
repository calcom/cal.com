import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { AppController } from "./app.controller";
import appConfig from "./config/app";
import { AppLoggerMiddleware } from "./middleware/app.logger.middleware";
import { RewriterMiddleware } from "./middleware/app.rewrites.middleware";
import { JsonBodyMiddleware } from "./middleware/body/json.body.middleware";
import { RawBodyMiddleware } from "./middleware/body/raw.body.middleware";
import { ResponseInterceptor } from "./middleware/request-ids/request-id.interceptor";
import { RequestIdMiddleware } from "./middleware/request-ids/request-id.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { EndpointsModule } from "./modules/endpoints.module";
import { JwtModule } from "./modules/jwt/jwt.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [appConfig],
    }),
    EndpointsModule,
    AuthModule,
    JwtModule,
  ],
  controllers: [AppController],
  providers: [
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
      .apply(RewriterMiddleware)
      .forRoutes("/");
  }
}
