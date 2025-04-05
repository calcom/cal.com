import { z } from "zod";

export const ZUpdateHideOrganizerEmailInputSchema = z.object({
  id: z.number(),
  hideOrganizerEmail: z.boolean(),
});

export type TUpdateHideOrganizerEmailInputSchema = z.infer<typeof ZUpdateHideOrganizerEmailInputSchema>;
