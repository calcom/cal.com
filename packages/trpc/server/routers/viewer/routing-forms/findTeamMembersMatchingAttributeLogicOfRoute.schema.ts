import { z } from "zod";

import { zodNonRouterRoute } from "@calcom/routing-forms/zod";

export const ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema = z.object({
  formId: z.string(),
  response: z.record(
    z.object({
      label: z.string(),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
    })
  ),
  route: zodNonRouterRoute,
  isPreview: z.boolean().optional(),
  _enablePerf: z.boolean().optional(),
  _concurrency: z.number().optional(),
});

export type TFindTeamMembersMatchingAttributeLogicOfRouteInputSchema = z.infer<
  typeof ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema
>;
