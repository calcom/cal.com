import type { RouterOutputs } from "@calcom/trpc/react";
import { z } from "zod";

export type RoutingFormTableRow = RouterOutputs["viewer"]["insights"]["routingFormResponses"]["data"][number];

export type HeaderRow = RouterOutputs["viewer"]["insights"]["routingFormResponsesHeaders"][number];

export const ZResponseMultipleValues = z.array(z.string());

export const ZResponseSingleValue = z.string();

export const ZResponseTextValue = z.string();

export const ZResponseNumericValue = z.number();

export const ZResponseValue = z.union([
  ZResponseMultipleValues,
  ZResponseSingleValue,
  ZResponseTextValue,
  ZResponseNumericValue,
]);

export type ResponseValue = z.infer<typeof ZResponseValue>;

export const ZResponse = z.record(z.string(), ZResponseValue);
