import type z from "zod";

import type { zodNonRouterField } from "@calcom/app-store/apps/routing-forms/zod";
import type { routingFormResponseInDbSchema } from "@calcom/app-store/apps/routing-forms/zod";

export type RoutingFormResponseData = {
  fields: z.infer<typeof zodNonRouterField>[];
  response: z.infer<typeof routingFormResponseInDbSchema>;
};
