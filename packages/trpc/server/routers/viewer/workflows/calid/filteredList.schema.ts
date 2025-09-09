"use client";

import { z } from "zod";

import { filterQuerySchemaStrict } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";

export const ZCalIdFilteredListInputSchema = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
  })
  .nullish();

export type TCalIdFilteredListInputSchema = z.infer<typeof ZCalIdFilteredListInputSchema>;
