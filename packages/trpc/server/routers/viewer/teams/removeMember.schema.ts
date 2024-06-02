import { z } from "zod";

export const ZRemoveMemberInputSchema = z.object({
  teamIds: z.array(z.number()),
  memberIds: z.array(z.number()),
  isOrg: z.boolean().default(false),
  redirectTo: z.number().optional(),
});

export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
