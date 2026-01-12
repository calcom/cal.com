import { z } from "zod";

import { InternalNotePresetType } from "@calcom/prisma/enums";

export type TUpdateInternalNotesPresetsInputSchema = {
  teamId: number;
  type: InternalNotePresetType;
  presets: {
    id: number;
    name: string;
    cancellationReason?: string;
  }[];
};

export const ZUpdateInternalNotesPresetsInputSchema: z.ZodType<TUpdateInternalNotesPresetsInputSchema> = z.object({
  teamId: z.number(),
  type: z.nativeEnum(InternalNotePresetType),
  presets: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      cancellationReason: z.string().optional(),
    })
  ),
});
