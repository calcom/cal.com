import { z } from "zod";

export const ZCheckIfMembershipExistsInputSchema = z.object({
  teamId: z.number(),
  value: z.string(),
});

export type TCheckIfMembershipExistsInputSchema = z.infer<typeof ZCheckIfMembershipExistsInputSchema>;
