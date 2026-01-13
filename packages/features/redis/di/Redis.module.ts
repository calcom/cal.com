import { type Container } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { redisModule } from "./redisModule";

const token = DI_TOKENS.REDIS_CLIENT;

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(token, redisModule);
  },
};
