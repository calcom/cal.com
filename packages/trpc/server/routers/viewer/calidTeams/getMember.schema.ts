import { z } from "zod";

export const ZGetMemberSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
});

export type ZGetMemberInput = z.infer<typeof ZGetMemberSchema>;
