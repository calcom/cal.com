import { z } from "zod";

import { zodAttributesQueryValue } from "@calcom/lib/raqb/zod";

export const ZFindTeamMembersMatchingAttributeLogicInputSchema = z.object({
  teamId: z.number(),
  attributesQueryValue: zodAttributesQueryValue.nullable(),
  isPreview: z.boolean().optional(),
  _enablePerf: z.boolean().optional(),
  _concurrency: z.number().optional(),
});

export type TFindTeamMembersMatchingAttributeLogicInputSchema = z.infer<
  typeof ZFindTeamMembersMatchingAttributeLogicInputSchema
>;
