import { z } from "zod";

export const ZRemoveMemberInputSchema = z.object({
  teamIds: z.array(z.number()),
  memberIds: z.array(z.number()),
  isOrg: z.boolean().default(false),
});

export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
