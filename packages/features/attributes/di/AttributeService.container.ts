import { createContainer } from "@calcom/features/di/di";
import { type AttributeService, moduleLoader as attributeServiceModule } from "./AttributeService.module";

const attributeServiceContainer = createContainer();

export function getAttributeService(): AttributeService {
  attributeServiceModule.loadModule(attributeServiceContainer);

  return attributeServiceContainer.get<AttributeService>(attributeServiceModule.token);
}
