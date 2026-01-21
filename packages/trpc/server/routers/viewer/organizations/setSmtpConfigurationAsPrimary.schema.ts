import { z } from "zod";

export const ZSetSmtpConfigurationAsPrimaryInputSchema = z.object({
  id: z.number().int(),
});

export type TSetSmtpConfigurationAsPrimaryInput = z.infer<typeof ZSetSmtpConfigurationAsPrimaryInputSchema>;
