import { z } from "zod";

export const ZAppsInputSchema = z.object({
  extendsFeature: z.literal("EventType"),
});

export type TAppsInputSchema = z.infer<typeof ZAppsInputSchema>;
