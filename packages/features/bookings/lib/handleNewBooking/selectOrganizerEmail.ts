import type { EventType } from "@prisma/client";

export const selectOrganizerEmail = ({
  organizerEmail,
  useEventTypeDestinationCalendarEmail,
  destinationCalendar,
  secondaryEmailId,
  secondaryEmail,
}: {
  organizerEmail: string;
  useEventTypeDestinationCalendarEmail: boolean;
  destinationCalendar: EventType["destinationCalendar"];
  secondaryEmailId: EventType["secondaryEmailId"];
  secondaryEmail: EventType["secondaryEmail"];
}) => {
  if (useEventTypeDestinationCalendarEmail && destinationCalendar?.[0]?.primaryEmail) {
    return destinationCalendar[0].primaryEmail;
  } else if (secondaryEmailId && secondaryEmail?.email) {
    return secondaryEmail.email;
  }

  return organizerEmail || "Email-less";
};
