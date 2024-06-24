import { z } from "zod";

export const cityTimezonesSchema = z.object({
  CalComVersion: z.string(),
});

export type I18nInputSchema = z.infer<typeof cityTimezonesSchema>;
