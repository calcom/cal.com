import { getDefaultEvent } from "@calcom/features/eventtypes/lib/defaultEvents";
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

  const isOrgTeamEvent = !!eventType?.team && !!eventType?.team?.parentId;

  return {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields({ ...eventType, isOrgTeamEvent }),
  };
};

export const getEventType = withReporting(_getEventType, "getEventType");
