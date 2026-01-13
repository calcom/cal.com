import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import type { IRedisService } from "../IRedisService";
import { NoopRedisService } from "../NoopRedisService";
import { RedisService } from "../RedisService";

const redisModule = createModule();
const token = DI_TOKENS.REDIS_CLIENT;

redisModule.bind(token).toFactory(() => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new RedisService();
  }
  return new NoopRedisService();
}, "singleton");

export const moduleLoader: ModuleLoader = {
  token,
  loadModule: (container) => {
    container.load(token, redisModule);
  },
};

export { redisModule };
export type { IRedisService };
