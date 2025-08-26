import { z } from "zod";

export const ZGetActiveOnOptionsSchema = z
  .object({
    teamId: z.number().optional(),
    isOrg: z.boolean().default(false),
  })
  .nullish();

export type TGetActiveOnOptionsSchema = z.infer<typeof ZGetActiveOnOptionsSchema>;
