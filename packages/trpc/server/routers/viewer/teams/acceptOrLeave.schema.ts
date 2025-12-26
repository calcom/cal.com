import { z } from "zod";

// In zod v4, using z.ZodType<T> annotation breaks input type inference for tRPC mutations.
// Use satisfies instead to preserve type inference while checking compatibility.
export const ZAcceptOrLeaveInputSchema = z.object({
  teamId: z.number(),
  accept: z.boolean(),
}) satisfies z.ZodType<{
  teamId: number;
  accept: boolean;
}>;

export type TAcceptOrLeaveInputSchema = z.infer<typeof ZAcceptOrLeaveInputSchema>;
