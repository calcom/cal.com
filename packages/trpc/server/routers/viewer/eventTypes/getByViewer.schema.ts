import { z } from "zod";

import { SchedulingType } from "@calcom/prisma/enums";

// Define types first to use with z.ZodType annotation
export type TFilterQuerySchemaStrict = {
  teamIds?: number[];
  upIds?: string[];
  schedulingTypes?: SchedulingType[];
};

export const filterQuerySchemaStrict: z.ZodType<TFilterQuerySchemaStrict> = z.object({
  teamIds: z.number().array().optional(),
  // A user can only filter by only his userId
  upIds: z.string().array().max(1).optional(),
  schedulingTypes: z.nativeEnum(SchedulingType).array().optional(),
});

export type TEventTypeInputSchema = {
  filters?: TFilterQuerySchemaStrict;
  forRoutingForms?: boolean;
} | null | undefined;

export const ZEventTypeInputSchema: z.ZodType<TEventTypeInputSchema> = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
    forRoutingForms: z.boolean().optional(),
  })
  .nullish();

export type TGetEventTypesFromGroupSchemaInput = {
  filters?: TFilterQuerySchemaStrict;
  forRoutingForms?: boolean;
  cursor?: number | null;
  limit?: number;
  group: { teamId?: number | null; parentId?: number | null };
  searchQuery?: string;
};

export type TGetEventTypesFromGroupSchema = {
  filters?: TFilterQuerySchemaStrict;
  forRoutingForms?: boolean;
  cursor?: number | null;
  limit: number;
  group: { teamId?: number | null; parentId?: number | null };
  searchQuery?: string;
};

export const ZGetEventTypesFromGroupSchema: z.ZodType<TGetEventTypesFromGroupSchema, z.ZodTypeDef, TGetEventTypesFromGroupSchemaInput> = z.object({
  filters: filterQuerySchemaStrict.optional(),
  forRoutingForms: z.boolean().optional(),
  cursor: z.number().nullish(),
  limit: z.number().default(10),
  group: z.object({ teamId: z.number().nullish(), parentId: z.number().nullish() }),
  searchQuery: z.string().optional(),
});
