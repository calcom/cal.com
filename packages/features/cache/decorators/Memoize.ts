import { getRedisService } from "@calcom/features/di/containers/Redis";
import type { ZodSchema } from "zod";
import { DEFAULT_TTL_MS } from "./types";

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
      } catch {
        // Silently ignore cache read errors and proceed to fetch from source
      }

      const result = await originalMethod.apply(this, args);

      // Try to cache the result, but don't let Redis failures break the flow
      if (result !== null && result !== undefined) {
        try {
          const redis = getRedisService();
          await redis.set(cacheKey, result, { ttl: config.ttl ?? DEFAULT_TTL_MS });
        } catch {
          // Silently ignore cache write errors
        }
      }

      return result;
    };

    descriptor.value = wrappedMethod as T;

    return descriptor;
  };
}
