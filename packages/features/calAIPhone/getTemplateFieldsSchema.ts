import type { TemplateType } from "./zod-utils";
import { fieldSchemaMap } from "./zod-utils";

export const getTemplateFieldsSchema = ({ templateType }: { templateType: string }) => {
  return fieldSchemaMap[templateType as TemplateType];
};
