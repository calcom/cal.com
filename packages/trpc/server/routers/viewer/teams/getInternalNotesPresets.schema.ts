import { z } from "zod";

export type TGetInternalNotesPresetsInputSchema = {
  teamId: number;
};

export const ZGetInternalNotesPresetsInputSchema: z.ZodType<TGetInternalNotesPresetsInputSchema> = z.object({
  teamId: z.number(),
});
