import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { withReporting } from "@calcom/lib/sentryWrapper";

import { getBookingFieldsWithSystemFields } from "../getBookingFields";
import { getEventTypesFromDB } from "./getEventTypesFromDB";

const _getEventType = async ({
  eventTypeId,
  eventTypeSlug,
}: {
  eventTypeId: number;
  eventTypeSlug?: string;
}) => {
  // handle dynamic user
  const eventType =
    !eventTypeId && !!eventTypeSlug ? getDefaultEvent(eventTypeSlug) : await getEventTypesFromDB(eventTypeId);

  return {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields({ ...eventType }),
  };
};

export const getEventType = withReporting(_getEventType, "getEventType");
