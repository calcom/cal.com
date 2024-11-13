import { z } from "zod";

import { zodNonRouterRoute } from "../zod";

export const ZFindTeamMembersMatchingAttributeLogicInputSchema = z.object({
  formId: z.string(),
  response: z.record(z.string(), z.any()),
  route: zodNonRouterRoute,
  isPreview: z.boolean().optional(),
  _enablePerf: z.boolean().optional(),
  _concurrency: z.number().optional(),
});

export type TFindTeamMembersMatchingAttributeLogicInputSchema = z.infer<
  typeof ZFindTeamMembersMatchingAttributeLogicInputSchema
>;
