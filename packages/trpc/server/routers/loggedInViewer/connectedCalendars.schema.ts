import { z } from "zod";

export const ZConnectedCalendarsInputSchema = z
  .object({
    onboarding: z.boolean().optional(),
    type: z.string().optional(),
  })
  .optional();

export type TConnectedCalendarsInputSchema = z.infer<typeof ZConnectedCalendarsInputSchema>;
