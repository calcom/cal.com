import { z } from "zod";

export const ZDeleteSmtpConfigurationInputSchema = z.void();

export type TDeleteSmtpConfigurationInput = z.infer<typeof ZDeleteSmtpConfigurationInputSchema>;
