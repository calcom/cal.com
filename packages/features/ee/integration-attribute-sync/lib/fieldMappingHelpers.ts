import type { FieldMapping } from "../schemas/zod";

export const getDefaultFieldMapping = (): FieldMapping => ({
  integrationFieldName: "",
  attributeId: "",
  enabled: true,
});
