import { z } from "zod";

export type TRemoveHostsFromEventTypes = {
  userIds: number[];
  teamId: number;
  eventTypeIds: number[];
};

export const ZRemoveHostsFromEventTypes: z.ZodType<TRemoveHostsFromEventTypes> = z.object({
  userIds: z.array(z.number()),
  teamId: z.number(),
  eventTypeIds: z.array(z.number()),
});
