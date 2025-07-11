import "./instrument";

import { AppController } from "@/app.controller";
import appConfig from "@/config/app";
import { EndpointsModule } from "@/modules/endpoints.module";
import { JwtModule } from "@/modules/jwt/jwt.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RedisService } from "@/modules/redis/redis.service";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { BullModule } from "@nestjs/bull";
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const redisAvailable = !!process.env.REDIS_URL;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),

    ...(redisAvailable ? [RedisModule] : []),
    ...(redisAvailable && !isServerless
      ? [
          BullModule.forRoot({
            redis: `${process.env.REDIS_URL}${process.env.NODE_ENV === "production" ? "?tls=true" : ""}`,
          }),
        ]
      : []),
    ...(redisAvailable
      ? [
          ThrottlerModule.forRootAsync({
            imports: [RedisModule],
            inject: [RedisService],
            useFactory: (redisService: RedisService) => ({
              throttlers: [
                {
                  name: "default",
                  ttl: 60000,
                  limit: 120,
                },
              ],
              storage: new ThrottlerStorageRedisService(redisService.redis),
            }),
          }),
        ]
      : [
          ThrottlerModule.forRoot({
            throttlers: [
              {
                name: "default",
                ttl: 60000,
                limit: 120,
              },
            ],
          }),
        ]),
    PrismaModule,
    JwtModule,
    EndpointsModule,
  ],
  controllers: [AppController],
  providers: [
    ...(redisAvailable
      ? [
          {
            provide: ThrottlerStorageRedisService,
            useFactory: (redisService: RedisService) => {
              return new ThrottlerStorageRedisService(redisService.redis);
            },
            inject: [RedisService],
          },
        ]
      : []),
  ],
})
export class ServerlessAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply()
      .exclude(
        { path: "health", method: RequestMethod.GET },
        { path: "api/health", method: RequestMethod.GET },
        { path: "v1/(.*)", method: RequestMethod.ALL },
        { path: "v2/health", method: RequestMethod.GET },
        { path: "docs", method: RequestMethod.GET },
        { path: "docs/(.*)", method: RequestMethod.ALL },
        { path: "v2/docs", method: RequestMethod.GET },
        { path: "v2/docs/(.*)", method: RequestMethod.ALL }
      )
      .forRoutes("*");
  }
}
