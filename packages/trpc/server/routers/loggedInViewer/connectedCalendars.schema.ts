import { z } from "zod";

export const ZConnectedCalendarsInputSchema = z
  .object({
    onboarding: z.boolean().optional(),
  })
  .optional();

export type TConnectedCalendarsInputSchema = z.infer<typeof ZConnectedCalendarsInputSchema>;
