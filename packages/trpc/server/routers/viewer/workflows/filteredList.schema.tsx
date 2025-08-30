"use client";

import { z } from "zod";

import { filterQuerySchemaStrict } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";

export const ZFilteredListInputSchema = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
  })
  .nullish();

export type TFilteredListInputSchema = z.infer<typeof ZFilteredListInputSchema>;
