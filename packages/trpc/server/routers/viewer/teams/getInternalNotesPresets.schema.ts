import { z } from "zod";

export const ZGetInternalNotesPresetsInputSchema = z.object({
  teamId: z.number(),
});

export type TGetInternalNotesPresetsInputSchema = z.infer<typeof ZGetInternalNotesPresetsInputSchema>;
