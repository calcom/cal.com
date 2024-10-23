import { z } from "zod";

export const ZGetFacetedValuesInput = z.object({
  include: z.enum(["users", "roles", "teams", "attributes"]).array().optional(),
});

export type TGetFacetedValuesInputSchema = z.infer<typeof ZGetFacetedValuesInput>;
