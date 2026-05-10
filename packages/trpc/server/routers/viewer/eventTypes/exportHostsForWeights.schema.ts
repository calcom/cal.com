import { z } from "zod";

export const ZExportHostsForWeightsInputSchema = z.object({
  eventTypeId: z.number(),
  assignAllTeamMembers: z.boolean(),
});

export type TExportHostsForWeightsInputSchema = z.infer<typeof ZExportHostsForWeightsInputSchema>;
