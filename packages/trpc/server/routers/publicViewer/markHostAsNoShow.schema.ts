import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TNoShowInputSchema = {
  bookingUid: string;
  noShowHost: boolean;
};

export const ZMarkHostAsNoShowInputSchema: z.ZodType<TNoShowInputSchema> = z.object({
  bookingUid: z.string(),
  noShowHost: z.boolean(),
});
