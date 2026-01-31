import { createContainer } from "@calcom/features/di/di";
import type { ProrationEmailTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationEmailTasker";

import { moduleLoader as prorationEmailTaskerModule } from "./ProrationEmailTasker.module";
import { PRORATION_EMAIL_TASKER_DI_TOKENS } from "./tokens";

const container = createContainer();

export function getProrationEmailTasker(): ProrationEmailTasker {
  prorationEmailTaskerModule.loadModule(container);
  return container.get<ProrationEmailTasker>(PRORATION_EMAIL_TASKER_DI_TOKENS.PRORATION_EMAIL_TASKER);
}
