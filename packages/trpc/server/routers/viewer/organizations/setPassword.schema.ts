import { z } from "zod";

export const ZSetPasswordSchema = z.object({
  newPassword: z.string(),
});

export type TSetPasswordSchema = z.infer<typeof ZSetPasswordSchema>;
