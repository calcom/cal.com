import { AppLoggerMiddleware } from "@/app.logger.middleware";
import appConfig from "@/config/app";
import { AuthModule } from "@/modules/auth/auth.module";
import { EndpointsModule } from "@/modules/endpoints.module";
import { JwtModule } from "@/modules/jwt/jwt.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
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
    // ThrottlerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService<AppConfig>) => ({
    //     throttlers: [
    //       {
    //         name: "short",
    //         ttl: seconds(10),
    //         limit: 3,
    //       },
    //     ],
    //     storage: new ThrottlerStorageRedisService(config.get("db.redisUrl", { infer: true })),
    //   }),
    // }),
    PrismaModule,
    EndpointsModule,
    AuthModule,
    JwtModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppLoggerMiddleware).forRoutes("*");
  }
}
