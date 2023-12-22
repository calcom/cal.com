import { AppLoggerMiddleware } from "@/app.logger.middleware";
import appConfig from "@/config/app";
import { AuthModule } from "@/modules/auth/auth.module";
import { EndpointsModule } from "@/modules/endpoints/endpoints.module";
import { PrismaModule } from "@/modules/services/prisma/prisma.module";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    EndpointsModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppLoggerMiddleware).forRoutes("*");
  }
}
