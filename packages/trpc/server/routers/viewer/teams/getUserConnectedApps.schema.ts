import { z } from "zod";

export const ZGetUserConnectedAppsInputSchema = z.object({
  userIds: z.array(z.number()),
});

export type TGetUserConnectedAppsInputSchema = z.infer<typeof ZGetUserConnectedAppsInputSchema>;
