import { z } from "zod";

export const ZDeleteInviteInputSchema = z.object({
  token: z.string(),
});

export type TDeleteInviteInputSchema = z.infer<typeof ZDeleteInviteInputSchema>;
