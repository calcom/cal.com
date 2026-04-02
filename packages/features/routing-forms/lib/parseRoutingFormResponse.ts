import type { RoutingFormResponseData } from "./types";
import { routingFormResponseInDbSchema, zodNonRouterField } from "./zod";

export function parseRoutingFormResponse(rawResponse: unknown, formFields: unknown): RoutingFormResponseData {
  const response = routingFormResponseInDbSchema.parse(rawResponse);
  const fields = zodNonRouterField.array().parse(formFields);
  return { response, fields };
}
