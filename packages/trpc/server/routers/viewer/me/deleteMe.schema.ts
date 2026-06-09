import { z } from "zod";

export const ZDeleteMeInputSchema = z.object({
  password: z.string().min(1, { message: "Password is required" }),
  totpCode: z.string().optional(),
});

export type TDeleteMeInputSchema = z.infer<typeof ZDeleteMeInputSchema>;
