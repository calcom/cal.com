import { z } from "zod";

export type TGetMembershipbyUserInputSchema = {
  teamId: number;
  memberId: number;
};

export const ZGetMembershipbyUserInputSchema: z.ZodType<TGetMembershipbyUserInputSchema> = z.object({
  teamId: z.number(),
  memberId: z.number(),
});
