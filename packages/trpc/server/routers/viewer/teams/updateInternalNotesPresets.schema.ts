import { z } from "zod";

export type TUpdateInternalNotesPresetsInputSchema = {
  teamId: number;
  presets: {
    id: number;
    name: string;
    cancellationReason?: string;
  }[];
};

export const ZUpdateInternalNotesPresetsInputSchema: z.ZodType<TUpdateInternalNotesPresetsInputSchema> =
  z.object({
    teamId: z.number(),
    presets: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        cancellationReason: z.string().optional(),
      })
    ),
  });
