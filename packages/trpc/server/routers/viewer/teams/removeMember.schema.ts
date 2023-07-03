import { z } from "zod";

export const ZRemoveMemberInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  isOrg: z.boolean().default(false),
});

export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
