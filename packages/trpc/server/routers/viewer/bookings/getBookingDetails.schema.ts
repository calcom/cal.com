import { z } from "zod";

export type TGetBookingDetailsInputSchema = {
  uid: string;
};

export const ZGetBookingDetailsInputSchema = z.object({
  uid: z.string(),
});
