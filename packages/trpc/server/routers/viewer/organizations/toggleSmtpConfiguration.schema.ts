import { z } from "zod";

export const ZToggleSmtpConfigurationInputSchema = z.object({
  id: z.number(),
  isEnabled: z.boolean(),
});

export type TToggleSmtpConfigurationInputSchema = z.infer<typeof ZToggleSmtpConfigurationInputSchema>;
