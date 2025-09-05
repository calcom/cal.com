import type { routingFormResponseInDbSchema, zodNonRouterField } from "@calcom/app-store/routing-forms/zod";
import type z from "zod";

export type RoutingFormResponseData = {
  fields: z.infer<typeof zodNonRouterField>[];
  response: z.infer<typeof routingFormResponseInDbSchema>;
};
