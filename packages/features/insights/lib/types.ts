import { z } from "zod";

import type { RouterOutputs } from "@calcom/trpc";

export type RoutingFormTableRow = RouterOutputs["viewer"]["insights"]["routingFormResponses"]["data"][number];

export type HeaderRow = RouterOutputs["viewer"]["insights"]["routingFormResponsesHeaders"][number];

export const ZResponseMultipleValues = z.object({
  label: z.string(),
  value: z.array(z.string()),
});

export const ZResponseSingleValue = z.object({
  label: z.string(),
  value: z.string(),
});

export const ZResponseTextValue = z.object({
  label: z.string(),
  value: z.string(),
});

export const ZResponseNumericValue = z.object({
  label: z.string(),
  value: z.number(),
});

export const ZResponseValue = z.union([
  ZResponseMultipleValues,
  ZResponseSingleValue,
  ZResponseTextValue,
  ZResponseNumericValue,
]);

export type ResponseValue = z.infer<typeof ZResponseValue>;

export const ZResponse = z.record(z.string(), ZResponseValue);
