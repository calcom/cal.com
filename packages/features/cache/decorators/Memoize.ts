import type { ZodSchema } from "zod";

import type { WithRedis } from "./types";
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

    const wrappedMethod = async function (this: WithRedis, ...args: unknown[]): Promise<unknown> {
      const cacheKey = config.key(...args) as string;
      const cached = await this.redis.get<unknown>(cacheKey);

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

      const result = await originalMethod.apply(this, args);

      if (result !== null && result !== undefined) {
        await this.redis.set(cacheKey, result, { ttl: config.ttl ?? DEFAULT_TTL_MS });
      }

      return result;
    };

    descriptor.value = wrappedMethod as T;

    return descriptor;
  };
}
