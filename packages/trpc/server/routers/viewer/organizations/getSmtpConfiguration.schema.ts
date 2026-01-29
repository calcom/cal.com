import { z } from "zod";

export const ZGetSmtpConfigurationInputSchema = z.object({
  id: z.number().int(),
});

export type TGetSmtpConfigurationInput = z.infer<typeof ZGetSmtpConfigurationInputSchema>;
