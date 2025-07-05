import { AppConfig } from "@/config/type";
import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  public redis: Redis;
  private readonly logger = new Logger("RedisService");

  constructor(readonly configService: ConfigService<AppConfig>) {
    const dbUrl = configService.get<string>("db.redisUrl", { infer: true });
    if (!dbUrl) {
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        this.logger.warn("Redis URL not configured in serverless environment, using mock Redis");
        this.redis = this.createMockRedis();
        return;
      }
      throw new Error("Misconfigured Redis, halting.");
    }

    this.redis = new Redis(dbUrl);
  }

  private createMockRedis(): any {
    return {
      get: async () => null,
      set: async () => "OK",
      del: async () => 1,
      exists: async () => 0,
      expire: async () => 1,
      quit: async () => "OK",
    };
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch (err) {
      this.logger.error(err);
    }
  }
}
