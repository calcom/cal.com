import { z } from "zod";

export type TAddMembersToEventTypes = {
  userIds: number[];
  teamId: number;
  eventTypeIds: number[];
};

export const ZAddMembersToEventTypes = z.object({
  userIds: z.array(z.number()),
  teamId: z.number(),
  eventTypeIds: z.array(z.number()),
});
