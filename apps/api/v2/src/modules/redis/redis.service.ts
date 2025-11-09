import { AppConfig } from "@/config/type";
import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  public redis: Redis;
  private readonly logger = new Logger("RedisService");
  private isReady = false; // Track connection status

  constructor(readonly configService: ConfigService<AppConfig>) {
    const dbUrl = configService.get<string>("db.redisUrl", { infer: true });
    if (!dbUrl) throw new Error("Misconfigured Redis, halting.");

    this.redis = new Redis(dbUrl);

    this.redis.on("error", (err) => {
      this.logger.error(`IoRedis connection error: ${err.message}`);
      this.isReady = false;
    });

    this.redis.on("connect", () => {
      this.logger.log("IoRedis connected!");
      this.isReady = true;
    });

    this.redis.on("reconnecting", (delay: string) => {
      this.logger.warn(`IoRedis reconnecting... next retry in ${delay}ms`);
    });

    this.redis.on("end", () => {
      this.logger.warn("IoRedis connection ended.");
      this.isReady = false;
    });
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async get<TData>(key: string): Promise<TData | null> {
    let data = null;
    if (!this.isReady) {
      return null;
    }

    try {
      data = await this.redis.get(key);
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis get failed: ${err.message}`);
    }

    if (data === null) {
      return null;
    }

    try {
      return JSON.parse(data) as TData;
    } catch {
      return data as TData;
    }
  }

  async del(key: string): Promise<number> {
    if (!this.isReady) {
      return 0;
    }
    try {
      return this.redis.del(key);
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis del failed: ${err.message}`);
      return 0;
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    if (!this.isReady) {
      return [];
    }
    try {
      return this.redis.keys(pattern);
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis getKeys failed: ${err.message}`);
      return [];
    }
  }

  async delMany(keys: string[]): Promise<number> {
    if (!this.isReady || keys.length === 0) {
      return 0;
    }
    try {
      return this.redis.del(...keys);
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis delMany failed: ${err.message}`);
      return 0;
    }
  }

  async set<TData>(key: string, value: TData, opts?: { ttl?: number }): Promise<"OK" | TData | null> {
    if (!this.isReady) {
      return null;
    }

    try {
      const stringifiedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      if (opts?.ttl) {
        await this.redis.set(key, stringifiedValue, "PX", opts.ttl);
      } else {
        await this.redis.set(key, stringifiedValue);
      }
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis set failed: ${err.message}`);
      return null;
    }

    return "OK";
  }

  async expire(key: string, seconds: number): Promise<0 | 1> {
    if (!this.isReady) {
      return 0;
    }
    try {
      return this.redis.expire(key, seconds) as Promise<0 | 1>;
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis expire failed: ${err.message}`);
      return 0;
    }
  }

  async lrange<TResult = string>(key: string, start: number, end: number): Promise<TResult[]> {
    if (!this.isReady) {
      return [];
    }
    try {
      const results = await this.redis.lrange(key, start, end);
      return results.map((item) => JSON.parse(item) as TResult);
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis lrange failed: ${err.message}`);
      return [];
    }
  }

  async lpush<TData>(key: string, ...elements: TData[]): Promise<number> {
    if (!this.isReady) {
      return 0;
    }
    try {
      const stringifiedElements = elements.map((element) =>
        typeof element === "object" ? JSON.stringify(element) : String(element)
      );
      return this.redis.lpush(key, ...stringifiedElements);
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis lpush failed: ${err.message}`);
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isReady) {
      return 0;
    }
    try {
      return this.redis.incr(key);
    } catch (err) {
      if (err instanceof Error) this.logger.error(`IoRedis incr failed: ${err.message}`);
      return 0;
    }
  }
}
