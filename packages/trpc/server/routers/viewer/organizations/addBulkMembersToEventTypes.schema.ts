import { z } from "zod";

export const ZAddBulkMembersToEventTypes = z.object({
  userIds: z.array(z.number()),
  teamIds: z.array(z.number()),
  eventTypeIds: z.array(z.number()),
});

export type TAddBulkMembersToEventTypes = z.infer<typeof ZAddBulkMembersToEventTypes>;
