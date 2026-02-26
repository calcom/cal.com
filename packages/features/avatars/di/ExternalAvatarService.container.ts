import { createContainer } from "@calcom/features/di/di";

import {
  type ExternalAvatarService,
  moduleLoader as externalAvatarServiceModule,
} from "./ExternalAvatarService.module";

const externalAvatarServiceContainer = createContainer();

export function getExternalAvatarService(): ExternalAvatarService {
  externalAvatarServiceModule.loadModule(externalAvatarServiceContainer);

  return externalAvatarServiceContainer.get<ExternalAvatarService>(externalAvatarServiceModule.token);
}
