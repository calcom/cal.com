import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";

import { getEventTypesFromDB } from "./getEventTypesFromDB";

export const getEventType = async ({
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
