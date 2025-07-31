import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { NoopRedisService } from "../NoopRedisService";
import { RedisService } from "../RedisService";

const redisModule = createModule();

redisModule.bind(DI_TOKENS.REDIS_CLIENT).toFactory(() => {
  if (process.env.NODE_ENV === "test") return new NoopRedisService();
  try {
    return new RedisService();
  } catch (error) {}
  // or fall back to a noop service if Redis is not available
  return new NoopRedisService();
}, "singleton");

export { redisModule };
