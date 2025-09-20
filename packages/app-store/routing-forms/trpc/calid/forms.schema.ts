import { z } from "zod";

import { filterQuerySchemaStrict } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";

export const ZCalidFormsInputSchema = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
  })
  .nullish();

export type TCalidFormsInputSchema = z.infer<typeof ZCalidFormsInputSchema>;
