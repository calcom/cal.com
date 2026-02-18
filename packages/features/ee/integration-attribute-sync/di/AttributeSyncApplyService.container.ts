import { createContainer } from "@calcom/features/di/di";

import {
  type AttributeSyncApplyService,
  moduleLoader as attributeSyncApplyServiceModule,
} from "./AttributeSyncApplyService.module";

const attributeSyncApplyServiceContainer = createContainer();

export function getAttributeSyncApplyService(): AttributeSyncApplyService {
  attributeSyncApplyServiceModule.loadModule(attributeSyncApplyServiceContainer);

  return attributeSyncApplyServiceContainer.get<AttributeSyncApplyService>(
    attributeSyncApplyServiceModule.token
  );
}
