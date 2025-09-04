import { z } from "zod";

export const ZGetUserConnectedAppsInputSchema = z.object({
  userIds: z.array(z.number()),
  teamId: z.number(),
});

export type TGetUserConnectedAppsInputSchema = z.infer<typeof ZGetUserConnectedAppsInputSchema>;
