import type { Container } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { redisModule } from "@calcom/features/redis/di/redisModule";

const token = DI_TOKENS.REDIS_CLIENT;
const moduleToken = Symbol("RedisModule");

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, redisModule);
  },
};
