import { z } from "zod";

export const ZCreateInviteInputSchema = z.object({
  teamId: z.number(),
});

export type TCreateInviteInputSchema = z.infer<typeof ZCreateInviteInputSchema>;
