import { z } from "zod";

export const ZVerifyTokenSchema = z.object({
  token: z.string().min(1),
  identifier: z.string().min(1),
});

export type TVerifyTokenSchema = z.infer<typeof ZVerifyTokenSchema>;
