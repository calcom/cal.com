import { z } from "zod";

export const ZGetSchema = z.object({
  email: z.string().email(),
});

export type TGetSchema = z.infer<typeof ZGetSchema>;
