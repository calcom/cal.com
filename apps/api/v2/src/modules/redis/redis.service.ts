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
    if (!dbUrl) throw new Error("Misconfigured Redis, halting.");

    this.redis = new Redis(dbUrl);
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async get<TData>(key: string): Promise<TData | null> {
    const data = await this.redis.get(key);
    if (data === null) {
      return null;
    }
    try {
      return JSON.parse(data) as TData;
    } catch (e) {
      return data as TData;
    }
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async set<TData>(key: string, value: TData, opts?: { ttl?: number }): Promise<"OK" | TData | null> {
    const stringifiedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
    if (opts?.ttl) {
      await this.redis.set(key, stringifiedValue, "EX", opts.ttl);
    } else {
      await this.redis.set(key, stringifiedValue);
    }

    return "OK";
  }

  async expire(key: string, seconds: number): Promise<0 | 1> {
    return this.redis.expire(key, seconds) as Promise<0 | 1>;
  }

  async lrange<TResult = string>(key: string, start: number, end: number): Promise<TResult[]> {
    const results = await this.redis.lrange(key, start, end);
    return results.map((item) => JSON.parse(item) as TResult);
  }

  async lpush<TData>(key: string, ...elements: TData[]): Promise<number> {
    const stringifiedElements = elements.map((element) =>
      typeof element === "object" ? JSON.stringify(element) : String(element)
    );
    return this.redis.lpush(key, ...stringifiedElements);
  }
}
