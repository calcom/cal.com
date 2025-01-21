import { z } from "zod";

export const ZUpdateInternalNotesPresetsInputSchema = z.object({
  teamId: z.number(),
  presets: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string(),
    })
  ),
});

export type TUpdateInternalNotesPresetsInputSchema = z.infer<typeof ZUpdateInternalNotesPresetsInputSchema>;
