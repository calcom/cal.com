import { z } from "zod";

export const ZAcceptOrLeaveInputSchema = z.object({
  teamId: z.number(),
  accept: z.boolean(),
});

export type TAcceptOrLeaveInputSchema = z.infer<typeof ZAcceptOrLeaveInputSchema>;
