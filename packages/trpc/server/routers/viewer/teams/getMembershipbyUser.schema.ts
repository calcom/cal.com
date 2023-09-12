import { z } from "zod";

export const ZGetMembershipbyUserInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
});

export type TGetMembershipbyUserInputSchema = z.infer<typeof ZGetMembershipbyUserInputSchema>;
