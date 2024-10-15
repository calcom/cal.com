import { z } from "zod";

export const ZCalendarAvailabilityInputSchema = z
  .object({
    token: z.string().optional(),
    type: z.string().optional(),
    externalId: z.string().optional(),
    credentialId: z.number().optional(),
    isOn: z.boolean().optional(),
  })
  .optional();

export type TCalendarAvailabilityInputSchema = z.infer<typeof ZCalendarAvailabilityInputSchema>;
