import { z } from "zod";

export const cityTimezonesSchema = z.object({
  CalComVersion: z.string(),
});

export type CityTimezonesSchema = z.infer<typeof cityTimezonesSchema>;
