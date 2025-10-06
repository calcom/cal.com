import { createModule } from "@evyweb/ioctopus";

import type { ITasker } from "@calcom/features/webhooks/lib/interface/infrastructure";

import { SHARED_TOKENS } from "../shared.tokens";

export const taskerServiceModule = createModule();

// Bind tasker with proper async factory that respects IoC
taskerServiceModule.bind(SHARED_TOKENS.TASKER).toFactory(async (): Promise<ITasker> => {
  const taskerModule = await import("@calcom/features/tasker");
  return taskerModule.default;
});
