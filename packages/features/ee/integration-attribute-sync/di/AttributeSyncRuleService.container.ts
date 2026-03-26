import { createContainer } from "@calcom/features/di/di";

import {
  type AttributeSyncRuleService,
  moduleLoader as attributeSyncRuleServiceModule,
} from "./AttributeSyncRuleService.module";

const attributeSyncRuleServiceContainer = createContainer();

export function getAttributeSyncRuleService(): AttributeSyncRuleService {
  attributeSyncRuleServiceModule.loadModule(attributeSyncRuleServiceContainer);

  return attributeSyncRuleServiceContainer.get<AttributeSyncRuleService>(
    attributeSyncRuleServiceModule.token
  );
}
