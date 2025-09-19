import { z } from "zod";

export const ZUpdateAutoTopUpSettingsSchema = z.object({
  teamId: z.number().optional(),
  autoTopUpEnabled: z.boolean(),
  autoTopUpThreshold: z.number().min(0).optional(),
  autoTopUpAmount: z.number().min(50).optional(),
});

export type TUpdateAutoTopUpSettingsSchema = z.infer<typeof ZUpdateAutoTopUpSettingsSchema>;
