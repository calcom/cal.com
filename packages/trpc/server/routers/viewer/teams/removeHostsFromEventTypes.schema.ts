import { z } from "zod";

export const ZRemoveHostsFromEventTypes = z.object({
  userIds: z.array(z.number()),
  teamId: z.number(),
  eventTypeIds: z.array(z.number()),
});

export type TRemoveHostsFromEventTypes = z.infer<typeof ZRemoveHostsFromEventTypes>;
