import type { LuckyUserService } from "@calcom/lib/server/getLuckyUser";

import { createContainer } from "../di";
import { moduleLoader as luckyUserServiceModuleLoader } from "../modules/LuckyUser";

const container = createContainer();

export function getLuckyUserService() {
  luckyUserServiceModuleLoader.loadModule(container);
  return container.get<LuckyUserService>(luckyUserServiceModuleLoader.token);
}
