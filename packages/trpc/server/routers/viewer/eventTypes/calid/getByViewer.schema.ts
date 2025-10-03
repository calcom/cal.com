import { z } from "zod";

import { SchedulingType } from "@calcom/prisma/enums";

export const filterQuerySchemaStrict = z.object({
  teamIds: z.number().array().optional(),
  upIds: z.string().array().max(1).optional(),
  schedulingTypes: z.nativeEnum(SchedulingType).array().optional(),
});

export const ZCalIdEventTypeInputSchema = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
    forRoutingForms: z.boolean().optional(),
  })
  .nullish();

export type TCalIdEventTypeInputSchema = z.infer<typeof ZCalIdEventTypeInputSchema>;

export const ZCalIdGetEventTypesFromGroupSchema = z.object({
  filters: filterQuerySchemaStrict.optional(),
  forRoutingForms: z.boolean().optional(),
  cursor: z.number().nullish(),
  limit: z.number().default(10),
  group: z.object({ calIdTeamId: z.number().nullish(), parentId: z.number().nullish() }),
  searchQuery: z.string().optional(),
});

export type TCalIdGetEventTypesFromGroupSchema = z.infer<typeof ZCalIdGetEventTypesFromGroupSchema>;
