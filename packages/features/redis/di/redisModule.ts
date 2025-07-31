import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { NoopRedisService } from "../NoopRedisService";
import { RedisService } from "../RedisService";

const redisModule = createModule();

redisModule.bind(DI_TOKENS.REDIS_CLIENT).toFactory(() => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new RedisService();
  }
  return new NoopRedisService();
}, "singleton");

export { redisModule };
