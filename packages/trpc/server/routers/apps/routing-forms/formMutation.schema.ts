import z from "zod";

import { zodFields, zodRoutes } from "@calcom/app-store/routing-forms/zod";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TFormMutationInputSchema = {
  id: string;
  name: string;
  description?: string | null;
  disabled?: boolean;
  fields: z.infer<typeof zodFields>;
  routes: z.infer<typeof zodRoutes>;
  addFallback?: boolean;
  duplicateFrom?: string | null;
  teamId?: number | null;
  shouldConnect?: boolean;
  settings?: z.infer<typeof RoutingFormSettings>;
};

export const ZFormMutationInputSchema: z.ZodType<TFormMutationInputSchema> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  disabled: z.boolean().optional(),
  fields: zodFields,
  routes: zodRoutes,
  addFallback: z.boolean().optional(),
  duplicateFrom: z.string().nullable().optional(),
  teamId: z.number().nullish().default(null),
  shouldConnect: z.boolean().optional(),
  settings: RoutingFormSettings.optional(),
});
