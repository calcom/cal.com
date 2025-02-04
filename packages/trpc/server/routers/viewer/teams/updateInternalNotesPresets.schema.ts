import { z } from "zod";

export const ZUpdateInternalNotesPresetsInputSchema = z.object({
  teamId: z.number(),
  presets: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      cancellationReason: z.string().optional(),
    })
  ),
});

export type TUpdateInternalNotesPresetsInputSchema = z.infer<typeof ZUpdateInternalNotesPresetsInputSchema>;
