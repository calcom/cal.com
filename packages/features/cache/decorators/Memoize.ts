import { getRedisService } from "@calcom/features/di/containers/Redis";
import logger from "@calcom/lib/logger";
import type { ZodSchema } from "zod";
import { DEFAULT_TTL_MS } from "./types";

const log = logger.getSubLogger({ prefix: ["@Memoize"] });

interface MemoizeOptions {
  // biome-ignore lint/complexity/noBannedTypes: Decorator key function needs to accept any argument types
  key: Function;
  ttl?: number;
  schema?: ZodSchema;
}

export function Memoize(config: MemoizeOptions) {
  return <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> => {
    const originalMethod = descriptor.value as ((...args: unknown[]) => Promise<unknown>) | undefined;

    if (!originalMethod || typeof originalMethod !== "function") {
      throw new Error(`@Memoize can only be applied to methods`);
    }

    const wrappedMethod = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const cacheKey = config.key(...args) as string;

      // Try to get from cache, but don't let Redis failures break the flow
      try {
        const redis = getRedisService();
        const cached = await redis.get<unknown>(cacheKey);

        if (cached !== null) {
          if (config.schema) {
            const parsed = config.schema.safeParse(cached);
            if (parsed.success) {
              return parsed.data;
            }
          } else {
            return cached;
          }
        }
      } catch (error) {
        log.warn("Cache read failed, proceeding to fetch from source", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      const result = await originalMethod.apply(this, args);

      // Try to cache the result, but don't let Redis failures break the flow
      if (result !== null && result !== undefined) {
        try {
          const redis = getRedisService();
          await redis.set(cacheKey, result, { ttl: config.ttl ?? DEFAULT_TTL_MS });
        } catch (error) {
          log.warn("Cache write failed", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return result;
    };

    descriptor.value = wrappedMethod as T;

    return descriptor;
  };
}
