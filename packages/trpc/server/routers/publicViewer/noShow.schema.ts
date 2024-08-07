import { z } from "zod";

export const ZNoShowInputSchema = z.object({
  token: z.string(),
});

export type TNoShowInputSchema = z.infer<typeof ZNoShowInputSchema>;
