import { slugify } from "@calcom/lib/slugify";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type z from "zod";
import type { bookingCreateSchemaLegacyPropsForApi } from "../bookingCreateBodySchema";
import type { getEventTypeResponse } from "./getEventTypesFromDB";

type CustomInputs = z.infer<typeof bookingCreateSchemaLegacyPropsForApi>["customInputs"];

type RequestBody = {
  responses?: Record<string, object>;
  customInputs?: CustomInputs;
};

function mapCustomInputs(
  customInputs: { label: string; value: CustomInputs[number]["value"] }[]
): Record<string, CustomInputs[number]["value"]> {
  return customInputs.reduce(
    (acc, { label, value }) => {
      acc[label] = value;
      return acc;
    },
    {} as Record<string, CustomInputs[number]["value"]>
  );
}

function mapResponsesToCustomInputs(
  responses: Record<string, object>,
  eventTypeCustomInputs: getEventTypeResponse["customInputs"]
): NonNullable<CalendarEvent["customInputs"]> {
  // Backward Compatibility: Map new `responses` to old `customInputs` format so that webhooks can still receive same values.
  return Object.entries(responses).reduce(
    (acc, [fieldName, fieldValue]) => {
      const foundInput = eventTypeCustomInputs.find((input) => slugify(input.label) === fieldName);
      if (foundInput) {
        acc[foundInput.label] = fieldValue;
      }
      return acc;
    },
    {} as NonNullable<CalendarEvent["customInputs"]>
  );
}

export function getCustomInputsResponses(
  reqBody: RequestBody,
  eventTypeCustomInputs: getEventTypeResponse["customInputs"]
): NonNullable<CalendarEvent["customInputs"]> {
  if (reqBody.customInputs && reqBody.customInputs.length > 0) {
    return mapCustomInputs(reqBody.customInputs);
  }

  const responses = reqBody.responses || {};
  return mapResponsesToCustomInputs(responses, eventTypeCustomInputs);
}
