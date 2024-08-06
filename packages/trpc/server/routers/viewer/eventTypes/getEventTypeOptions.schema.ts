import { z } from "zod";

export const ZGetEventTypeOptionsSchema = z
  .object({
    limit: z.number().default(10),
    teamId: z.number().optional(),
    isOrg: z.boolean().default(false),
    isMixedEventType: z.boolean().default(false),
    selectedOptions: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  })
  .nullish();

export type TGetEventTypeOptionsSchema = z.infer<typeof ZGetEventTypeOptionsSchema>;
