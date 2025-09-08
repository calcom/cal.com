import { z } from "zod";

export const ZCreateInviteInputSchema = z.object({
  teamId: z.number(),
  token: z.string().optional(),
});

export type TCreateInviteInputSchema = z.infer<typeof ZCreateInviteInputSchema>;
