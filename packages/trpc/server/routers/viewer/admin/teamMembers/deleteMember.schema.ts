import { z } from "zod";

export const ZDeleteMemberInputSchema = z.object({
  membershipId: z.number(),
});

export type TDeleteMemberInputSchema = z.infer<typeof ZDeleteMemberInputSchema>;
