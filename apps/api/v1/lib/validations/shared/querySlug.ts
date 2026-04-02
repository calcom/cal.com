import { z } from "zod";
import { baseApiParams } from "./baseApiParams";

export const schemaQuerySlug = baseApiParams.extend({
  slug: z.string().optional(),
});
