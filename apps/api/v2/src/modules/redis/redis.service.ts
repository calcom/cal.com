import { AppConfig } from "@/config/type";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  public redis: Redis;

  constructor(readonly configService: ConfigService<AppConfig>) {
    const dbUrl = configService.get<string>("db.redisUrl", { infer: true });
    if (!dbUrl) throw new Error("Misconfigured Redis, halting.");

    this.redis = new Redis(dbUrl);
  }

  async onModuleDestroy() {
    await this.redis.disconnect();
  }
}
