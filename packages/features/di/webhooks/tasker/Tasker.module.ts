import type { Container } from "@evyweb/ioctopus";

import type { ModuleLoader } from "@calcom/features/di/di";
import type { Tasker } from "@calcom/features/tasker/tasker";

import { taskerServiceModule } from "../../shared/services/tasker.service";
import { SHARED_TOKENS } from "../../shared/shared.tokens";

const token = SHARED_TOKENS.TASKER;

const loadModule = (container: Container) => {
  container.load(SHARED_TOKENS.TASKER, taskerServiceModule);
};

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { Tasker };
