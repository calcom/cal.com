"use client";

import type { TFilteredListInputSchema } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { filterQuerySchemaStrict } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { z } from "zod";

export const ZFilteredListInputSchema: z.ZodType<TFilteredListInputSchema> = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
  })
  .nullish();

export type { TFilteredListInputSchema };
