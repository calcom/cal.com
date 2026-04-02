import { createContainer } from "@calcom/features/di/di";
import {
  type AttributeSyncFieldMappingService,
  moduleLoader as attributeSyncFieldMappingServiceModule,
} from "./AttributeSyncFieldMappingService.module";

const attributeSyncFieldMappingServiceContainer = createContainer();

export function getAttributeSyncFieldMappingService(): AttributeSyncFieldMappingService {
  attributeSyncFieldMappingServiceModule.loadModule(attributeSyncFieldMappingServiceContainer);

  return attributeSyncFieldMappingServiceContainer.get<AttributeSyncFieldMappingService>(
    attributeSyncFieldMappingServiceModule.token
  );
}
