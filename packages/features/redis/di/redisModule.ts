import { Container, ModuleLoader, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { NoopRedisService } from "../NoopRedisService";
import { RedisService } from "../RedisService";

const redisModule = createModule();
const token = DI_TOKENS.REDIS_CLIENT;
const moduleToken = DI_TOKENS.REDIS_CLIENT_MODULE;
redisModule.bind(token).toFactory(() => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new RedisService();
  }
  return new NoopRedisService();
}, "singleton");

export { redisModule };

export const moduleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, redisModule);
    return redisModule;
  },
};
