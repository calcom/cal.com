import { z } from "zod";

export type TAcceptOrLeaveInputSchema = {
  teamId: number;
  accept: boolean;
};

export const ZAcceptOrLeaveInputSchema: z.ZodType<TAcceptOrLeaveInputSchema> = z.object({
  teamId: z.number(),
  accept: z.boolean(),
});
