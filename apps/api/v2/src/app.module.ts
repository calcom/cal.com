import appConfig from "@/config/app";
import { AppConfig } from "@/config/type";
import { AuthModule } from "@/modules/auth/auth.module";
import { EndpointsModule } from "@/modules/endpoints-module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@liaoliaots/nestjs-redis";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";

import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    RedisModule.forRootAsync({
      useFactory(configService: ConfigService<AppConfig, true>) {
        const url = configService.get("env.redisUrl", { infer: true });
        return {
          readyLog: true,
          config: {
            url,
            commandTimeout: 10_000,
            connectTimeout: 10_000,
            enableReadyCheck: true,
            enableAutoPipelining: true,
            autoPipeliningIgnoredCommands: ["EVALSHA"],
            noDelay: true,
            keepAlive: 1000,
          },
        };
      },
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    EndpointsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
