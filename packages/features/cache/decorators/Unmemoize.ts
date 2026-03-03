import { getRedisService } from "@calcom/features/di/containers/Redis";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["@Unmemoize"] });

interface UnmemoizeOptions {
  // biome-ignore lint/complexity/noBannedTypes: Decorator keys function needs to accept any argument types
  keys: Function;
}

export function Unmemoize(config: UnmemoizeOptions) {
  function wrapMethod(originalMethod: (...args: unknown[]) => Promise<unknown>) {
    return async function (this: unknown, ...args: unknown[]): Promise<unknown> {
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
  }

  // Support both legacy (experimentalDecorators) and TC39 2023-05 decorator formats.
  // Playwright's Babel transpiler uses TC39 2023-05 which passes (value, context),
  // while TypeScript's experimentalDecorators passes (target, propertyKey, descriptor).
  return function decoratorFn(...args: unknown[]): unknown {
    if (args.length === 2 && typeof args[0] === "function") {
      // TC39 2023-05 format: (value: Function, context: DecoratorContext)
      const originalMethod = args[0] as (...a: unknown[]) => Promise<unknown>;
      return wrapMethod(originalMethod);
    }

    // Legacy format: (target, propertyKey, descriptor)
    const descriptor = args[2] as TypedPropertyDescriptor<unknown>;
    const originalMethod = descriptor.value as ((...a: unknown[]) => Promise<unknown>) | undefined;
    if (!originalMethod || typeof originalMethod !== "function") {
      throw new Error(`@Unmemoize can only be applied to methods`);
    }
    descriptor.value = wrapMethod(originalMethod);
    return descriptor;
  } as <T>(_target: object, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T>;
}
