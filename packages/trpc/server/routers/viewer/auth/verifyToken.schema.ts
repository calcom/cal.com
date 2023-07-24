import { z } from "zod";

export const ZVerifyTokenSchema = z.object({
  code: z.string().min(1),
  email: z.string().min(1),
});

export type TVerifyTokenSchema = z.infer<typeof ZVerifyTokenSchema>;
