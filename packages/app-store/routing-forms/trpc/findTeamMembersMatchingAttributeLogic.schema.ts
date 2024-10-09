import { z } from "zod";

export const ZFindTeamMembersMatchingAttributeLogicInputSchema = z.object({
  formId: z.string(),
  response: z.record(z.string(), z.any()),
  routeId: z.string(),
});

export type TFindTeamMembersMatchingAttributeLogicInputSchema = z.infer<
  typeof ZFindTeamMembersMatchingAttributeLogicInputSchema
>;
