import { z } from "zod";

export const filterQuerySchemaStrict = z.object({
  teamIds: z.number().array().optional(),
  // A user can only filter by only his userId
  upIds: z.string().array().max(1).optional(),
});

export const ZEventTypeInputSchema = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
    forRoutingForms: z.boolean().optional(),
  })
  .nullish();

export type TEventTypeInputSchema = z.infer<typeof ZEventTypeInputSchema>;
