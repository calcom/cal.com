import { z } from "zod";

export const ZAutoAcceptInviteInputSchema = z.object({
  token: z.string(),
});

export type TAutoAcceptInviteInputSchema = z.infer<typeof ZAutoAcceptInviteInputSchema>;
