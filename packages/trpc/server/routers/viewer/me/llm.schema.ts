import { z } from "zod";

export const ZLlmInputSchema = z.object({
  prompt: z.string(),
});

export type TLlmInputSchema = z.infer<typeof ZLlmInputSchema>;
