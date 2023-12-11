import { AppConfig } from "@/config/type";
import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { ApiKeyService } from "@/modules/api-key/api-key.service";
import { BookingModule } from "@/modules/booking/booking.module";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { RedisService } from "@liaoliaots/nestjs-redis";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import rateLimit, { Options } from "express-rate-limit";
import rateLimitRedis from "rate-limit-redis";

@Module({
  imports: [BookingModule, OAuthClientModule, ApiKeyModule],
})
export class EndpointsModule implements NestModule {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly redisService: RedisService,
    private readonly apiKeyService: ApiKeyService
  ) {}
  configure(consumer: MiddlewareConsumer) {
    const redisClient = this.redisService.getClient();
    const defaultRateLimit = this.configService.get("api.defaultRateLimit", { infer: true });

    const rateLimitOptions: Partial<Options> = {
      windowMs: 1 * 60 * 1000,
      message: "Too Many Requests",
      standardHeaders: true,
      legacyHeaders: false,
      handler: (
        _request,
        response,
        _next,
        { statusCode, message }: { statusCode: number; message?: string }
      ) => {
        response.status(statusCode).json({ success: false, message });
      },
      store: new rateLimitRedis({
        sendCommand: (...args: string[]) => redisClient.call(...args),
      }),
      max: () => {
        // todo: allow incrementing limit per api key?
        return defaultRateLimit;
      },
      keyGenerator: (request) => {
        const apiKey = this.apiKeyService.getApiKeyFromRequest(request);
        if (apiKey) return apiKey;

        return null; // ip based?
      },
    };

    consumer.apply(rateLimit(rateLimitOptions)).forRoutes("*");
  }
}
