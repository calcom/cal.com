import type { FieldMapping } from "../types/fieldMapping";

export const getDefaultFieldMapping = (): FieldMapping => ({
  integrationFieldName: "",
  attributeId: "",
  enabled: true,
});
