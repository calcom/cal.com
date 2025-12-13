import { z } from "zod";

export type TUpdateInputSchema = {
  encodedRawMetadata: string;
  teamId: number | null;
};

export const ZUpdateInputSchema: z.ZodType<TUpdateInputSchema> = z.object({
  encodedRawMetadata: z.string(),
  teamId: z.union([z.number(), z.null()]),
});
