import { z } from "zod";

export const ZRemoveMemberSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export type ZRemoveMemberInput = z.infer<typeof ZRemoveMemberSchema>;
