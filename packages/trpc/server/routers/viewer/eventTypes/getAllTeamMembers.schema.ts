import { z } from "zod";

export const ZGetAllTeamMembersInputSchema = z.object({
  eventTypeId: z.number(),
});

export type TGetAllTeamMembersInputSchema = z.infer<typeof ZGetAllTeamMembersInputSchema>;
