import { z } from "zod";

import { zodAttributesQueryValue } from "@calcom/lib/raqb/zod";

export const ZExportHostsForWeightsInputSchema = z.object({
  eventTypeId: z.number(),
  teamId: z.number().optional(),
  assignAllTeamMembers: z.boolean(),
  assignRRMembersUsingSegment: z.boolean().optional(),
  attributesQueryValue: zodAttributesQueryValue.nullable().optional(),
});

export type TExportHostsForWeightsInputSchema = z.infer<typeof ZExportHostsForWeightsInputSchema>;
