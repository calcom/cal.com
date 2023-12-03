import { z } from "zod";

export const ZUpdateAvatarAssistantInputSchema = z.object({
  avatarId: z.string().optional(),
  voiceId: z.string().optional(),
  elevenlabsKey: z.string().optional(),
});

export type TUpdateAvatarAssistantInputSchema = z.infer<typeof ZUpdateAvatarAssistantInputSchema>;
