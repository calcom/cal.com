import { z } from "zod";

export const ZRemoveMemberSchema = z.object({
  teamIds: z.array(z.number()),
  memberIds: z.array(z.number()),
});

export type ZRemoveMemberInput = z.infer<typeof ZRemoveMemberSchema>;
