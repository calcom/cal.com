import { z } from "zod";

export const ZCompleteZohoCalendarSetupInputSchema = z
  .object({
    token: z.string().optional(),
  })
  .optional();

export type TCompleteZohoCalendarSetupInputSchema = z.infer<typeof ZCompleteZohoCalendarSetupInputSchema>;
