import type { IFieldMappingWithOptionalId } from "../repositories/IIntegrationAttributeSyncRepository";

export const getDefaultFieldMapping = (): IFieldMappingWithOptionalId => ({
  integrationFieldName: "",
  attributeId: "",
  enabled: true,
});
