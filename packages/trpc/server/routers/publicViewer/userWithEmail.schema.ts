import { z } from "zod";

export const ZUserWithEmailInputSchema = z.object({
  userEmail: z.string().optional(),
  email: z.string(),
});

export type TUserWithEmailInputSchema = z.infer<typeof ZUserWithEmailInputSchema>;
