import { z } from "zod";

export const ZGetListSchema = z
  .object({
    includeOrgs: z.boolean().optional(),
  })
  .optional();

export type TGetListSchema = z.infer<typeof ZGetListSchema>;
