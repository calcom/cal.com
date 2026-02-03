import { getRedisService } from "@calcom/features/di/containers/Redis";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["@Unmemoize"] });

interface UnmemoizeOptions {
  // biome-ignore lint/complexity/noBannedTypes: Decorator keys function needs to accept any argument types
  keys: Function;
}

export function Unmemoize(config: UnmemoizeOptions) {
  return <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> => {
    const originalMethod = descriptor.value as ((...args: unknown[]) => Promise<unknown>) | undefined;

    if (!originalMethod || typeof originalMethod !== "function") {
      throw new Error(`@Unmemoize can only be applied to methods`);
    }

    const wrappedMethod = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const result = await originalMethod.apply(this, args);

      try {
        const redis = getRedisService();
        const keysToInvalidate = config.keys(...args) as string[];
        await Promise.allSettled(keysToInvalidate.map((key) => redis.del(key)));
      } catch (error) {
        log.warn("Cache invalidation failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      return result;
    };

    descriptor.value = wrappedMethod as T;

    return descriptor;
  };
}
