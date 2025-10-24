import { z } from "zod";

export const ZWorkflowBuilderTemplateFieldsSchema = z.object({
  name: z.string(),
  actionType: z.string(),
  template: z.string(),
  triggerEvent: z.string(),
  time: z.number().int(),
});

export const ZCalIdCreateInputSchema = z.object({
  calIdTeamId: z.number().optional().nullable(),
  builderTemplate: ZWorkflowBuilderTemplateFieldsSchema.nullable().optional(),
});

export type TCalIdCreateInputSchema = z.infer<typeof ZCalIdCreateInputSchema>;
export type TWorkflowBuilderTemplateFieldsSchema = z.infer<typeof ZWorkflowBuilderTemplateFieldsSchema>;
