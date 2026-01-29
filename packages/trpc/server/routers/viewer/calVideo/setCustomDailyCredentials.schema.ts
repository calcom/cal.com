import { z } from "zod";

export const ZSetCustomDailyCredentialsInputSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

export type TSetCustomDailyCredentialsInputSchema = z.infer<typeof ZSetCustomDailyCredentialsInputSchema>;
