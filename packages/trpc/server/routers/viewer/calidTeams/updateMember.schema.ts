import { z } from "zod";

export const ZUpdateMemberSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  impersonation: z.boolean(),
});

export type ZUpdateMemberInput = z.infer<typeof ZUpdateMemberSchema>;
