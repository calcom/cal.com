import { z } from "zod";

import { InternalNotePresetType } from "@calcom/prisma/enums";

export type TGetInternalNotesPresetsInputSchema = {
  teamId: number;
  type?: InternalNotePresetType;
};

export const ZGetInternalNotesPresetsInputSchema: z.ZodType<TGetInternalNotesPresetsInputSchema> = z.object({
  teamId: z.number(),
  type: z.nativeEnum(InternalNotePresetType).optional(),
});
