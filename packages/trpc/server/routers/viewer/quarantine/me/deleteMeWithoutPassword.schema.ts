import { z } from "zod";

export const ZDeleteMeWithoutPasswordInputSchema = z.object({
  password: z.string(),
});

export type TDeleteMeWithoutPasswordInputSchema = z.infer<typeof ZDeleteMeWithoutPasswordInputSchema>;
