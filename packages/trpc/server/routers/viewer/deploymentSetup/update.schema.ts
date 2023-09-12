import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  licenseKey: z.string().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
