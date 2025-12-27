import { z } from "zod";

export type TGetUserConnectedAppsInputSchema = {
  userIds: number[];
  teamId: number;
};

export const ZGetUserConnectedAppsInputSchema = z.object({
  userIds: z.array(z.number()),
  teamId: z.number(),
});
