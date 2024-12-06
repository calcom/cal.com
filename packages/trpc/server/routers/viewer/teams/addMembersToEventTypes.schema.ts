import { z } from "zod";

export const ZAddMembersToEventTypes = z.object({
  userIds: z.array(z.number()),
  teamId: z.number(),
  eventTypeIds: z.array(z.number()),
});

export type TAddMembersToEventTypes = z.infer<typeof ZAddMembersToEventTypes>;
