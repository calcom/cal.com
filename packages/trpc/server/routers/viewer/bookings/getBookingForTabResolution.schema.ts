import { z } from "zod";

export type TGetBookingForTabResolutionInputSchema = {
  uid: string;
};

export const ZGetBookingForTabResolutionInputSchema: z.ZodType<TGetBookingForTabResolutionInputSchema> =
  z.object({
    uid: z.string(),
  });
