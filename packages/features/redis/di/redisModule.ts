import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { NoopRedisService } from "../NoopRedisService";
import { RedisService } from "../RedisService";

const redisModule = createModule();

redisModule.bind(DI_TOKENS.REDIS_CLIENT).toFactory(() => {
  try {
    return new RedisService();
  } catch (error) {}
  // or fall back to a noop service if Redis is not available
  return new NoopRedisService();
}, "singleton");

export { redisModule };
