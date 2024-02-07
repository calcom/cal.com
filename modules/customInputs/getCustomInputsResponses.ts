import {
  bookingCreateSchemaLegacyPropsForApi,
} from "@calcom/prisma/zod-utils";
import { getEventTypesFromDB } from "../eventTypes/getEventTypesFromDB";
import { slugify } from "@calcom/lib/slugify";
import z from "zod";
import { CalendarEvent } from "@calcom/types/Calendar";

export function getCustomInputsResponses(
  reqBody: {
    responses?: Record<string, object>;
    customInputs?: z.infer<typeof bookingCreateSchemaLegacyPropsForApi>["customInputs"];
  },
  eventTypeCustomInputs: Awaited<ReturnType<typeof getEventTypesFromDB>>["customInputs"]
) {
  const customInputsResponses = {} as NonNullable<CalendarEvent["customInputs"]>;
  if ("customInputs" in reqBody) {
    const reqCustomInputsResponses = reqBody.customInputs || [];
    if (reqCustomInputsResponses?.length > 0) {
      reqCustomInputsResponses.forEach(({ label, value }) => {
        customInputsResponses[label] = value;
      });
    }
  } else {
    const responses = reqBody.responses || {};
    // Backward Compatibility: Map new `responses` to old `customInputs` format so that webhooks can still receive same values.
    for (const [fieldName, fieldValue] of Object.entries(responses)) {
      const foundACustomInputForTheResponse = eventTypeCustomInputs.find(
        (input) => slugify(input.label) === fieldName
      );
      if (foundACustomInputForTheResponse) {
        customInputsResponses[foundACustomInputForTheResponse.label] = fieldValue;
      }
    }
  }

  return customInputsResponses;
}