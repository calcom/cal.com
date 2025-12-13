import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TAcceptOrLeaveInputSchema = {
  teamId: number;
  accept: boolean;
};

export const ZAcceptOrLeaveInputSchema: z.ZodType<TAcceptOrLeaveInputSchema> = z.object({
  teamId: z.number(),
  accept: z.boolean(),
});
