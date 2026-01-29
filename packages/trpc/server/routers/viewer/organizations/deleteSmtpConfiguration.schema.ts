import { z } from "zod";

export const ZDeleteSmtpConfigurationInputSchema = z.object({
  id: z.number().int(),
});

export type TDeleteSmtpConfigurationInput = z.infer<typeof ZDeleteSmtpConfigurationInputSchema>;
