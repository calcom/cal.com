import { z } from "zod";

export const cityTimezonesSchema = z.object({
  /** Content hash of timezone data — only changes when the data itself changes */
  hash: z.string(),
});

export type CityTimezonesSchema = z.infer<typeof cityTimezonesSchema>;
