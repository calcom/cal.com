import { z } from "zod";

export const ZVerifyEmailInputSchema = z.object({
  email: z.string().email(),
});
