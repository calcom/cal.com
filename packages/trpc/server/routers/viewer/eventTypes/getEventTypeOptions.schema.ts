import { z } from "zod";

export const ZGetEventTypeOptionsSchema = z
  .object({
    limit: z.number().default(10),
    teamId: z.number().optional(),
    isOrg: z.boolean().default(false),
  })
  .nullish();

export type TGetEventTypeOptionsSchema = z.infer<typeof ZGetEventTypeOptionsSchema>;
