import { z } from "zod";

export const ZAddBulkToEventType = z.object({
  userIds: z.array(z.number()),
  teamIds: z.array(z.number()),
  eventTypeIds: z.array(z.number()),
});

export type TAddBulkToEventType = z.infer<typeof ZAddBulkToEventType>;
