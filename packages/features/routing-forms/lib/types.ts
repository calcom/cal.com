import type z from "zod";
import type { routingFormResponseInDbSchema, zodNonRouterField } from "./zod";

export type FormResponse = Record<
  // Field ID
  string,
  {
    value: number | string | string[];
    label: string;
    identifier?: string;
  }
>;

export type Field = z.infer<typeof zodNonRouterField>;
export type Fields = Field[];

export type RoutingFormResponseData = {
  fields: z.infer<typeof zodNonRouterField>[];
  response: z.infer<typeof routingFormResponseInDbSchema>;
};
