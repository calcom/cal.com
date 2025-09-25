import z from "zod";

import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import { zodFields, zodRoutes } from "../../zod";

export const ZCalIdFormMutationInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  disabled: z.boolean().optional(),
  fields: zodFields,
  routes: zodRoutes,
  addFallback: z.boolean().optional(),
  duplicateFrom: z.string().nullable().optional(),
  calIdTeamId: z.number().nullish().default(null),
  shouldConnect: z.boolean().optional(),
  settings: RoutingFormSettings.optional(),
});

export type TCalIdFormMutationInputSchema = z.infer<typeof ZCalIdFormMutationInputSchema>;
