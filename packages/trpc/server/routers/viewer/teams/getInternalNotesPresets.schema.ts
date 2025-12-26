import { z } from "zod";

export type TGetInternalNotesPresetsInputSchema = {
  teamId: number;
};

export const ZGetInternalNotesPresetsInputSchema = z.object({
  teamId: z.number(),
});
