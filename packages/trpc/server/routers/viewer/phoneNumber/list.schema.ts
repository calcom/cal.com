import { z } from "zod";

export const ZListInputSchema = z
  .object({
    teamId: z.number().optional(),
    scope: z.enum(["personal", "team", "all"]).default("all"),
  })
  .optional();

export type TListInputSchema = z.infer<typeof ZListInputSchema>;
