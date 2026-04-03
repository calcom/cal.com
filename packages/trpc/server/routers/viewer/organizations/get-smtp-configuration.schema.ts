import { z } from "zod";

export const ZGetSmtpConfigurationInputSchema = z.void();

export type TGetSmtpConfigurationInput = z.infer<typeof ZGetSmtpConfigurationInputSchema>;
