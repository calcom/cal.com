import { z } from "zod";

export const ZAddMembersToEventType = z.object({
  userIds: z.array(z.number()),
  teamId: z.number(),
  eventTypeIds: z.array(z.number()),
});

export type TAddMembersToEventType = z.infer<typeof ZAddMembersToEventType>;
