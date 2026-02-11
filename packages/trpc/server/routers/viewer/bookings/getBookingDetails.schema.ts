import { z } from "zod";

export type TGetBookingDetailsInputSchema = {
  uid: string;
};

export const ZGetBookingDetailsInputSchema: z.ZodType<TGetBookingDetailsInputSchema> = z.object({
  uid: z.string(),
});
