import { z } from "zod";

export type TCheckIfMembershipExistsInputSchema = {
  teamId: number;
  value: string;
};

export const ZCheckIfMembershipExistsInputSchema: z.ZodType<TCheckIfMembershipExistsInputSchema> = z.object({
  teamId: z.number(),
  value: z.string(),
});
