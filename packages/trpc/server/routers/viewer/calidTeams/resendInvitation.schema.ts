import { z } from "zod";

export const ZResendCalidInvitationSchema = z.object({
  teamId: z.number(),
  email: z.string().email(),
  language: z.string().optional(),
});

export type TResendCalidInvitationInputSchema = z.infer<typeof ZResendCalidInvitationSchema>;
