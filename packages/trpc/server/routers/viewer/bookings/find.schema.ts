import { z } from "zod";

export type TFindInputSchema = {
  bookingUid?: string;
};

export const ZFindInputSchema = z.object({
  bookingUid: z.string().optional(),
});
