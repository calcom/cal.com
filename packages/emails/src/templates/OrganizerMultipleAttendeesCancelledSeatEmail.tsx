import type { TFunction } from "next-i18next";

import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

interface OrganizerMultipleAttendeesCancelledSeatEmailProps {
  calEvent: CalendarEvent;
  attendees: [Person, ...Person[]];
  attendeeCount: number;
  attendeeNames: string;
  isCancelledByHost?: boolean;
  t?: TFunction;
}

export const OrganizerMultipleAttendeesCancelledSeatEmail = ({
  attendeeCount,
  attendeeNames,
  isCancelledByHost,
  ...props
}: OrganizerMultipleAttendeesCancelledSeatEmailProps) => {
  const t = props.t || props.calEvent.organizer.language.translate;

  if (!props.attendees || props.attendees.length === 0) {
    throw new Error(
      "OrganizerMultipleAttendeesCancelledSeatEmail requires at least one attendee. Cannot render email without attendees."
    );
  }

  // Determine title based on number of attendees and who initiated the cancellation
  // Subject remains the same (event_cancelled_subject)
  // Use actual count: "2 attendees", "3 attendees", "4 attendees", etc.
  let titleKey = "";
  if (attendeeCount === 1) {
    titleKey = isCancelledByHost ? "attendee_was_removed" : "attendee_no_longer_attending";
  } else {
    titleKey = isCancelledByHost
      ? "multiple_attendees_were_removed"
      : "multiple_attendees_no_longer_attending";
  }

  // Render title with count for multiple attendees
  const titleText = attendeeCount === 1 ? t(titleKey) : t(titleKey, { count: attendeeCount });

  // Subtitle always uses the actual attendee names with appropriate action
  // Examples:
  // - "jack was removed. This means a seat has opened up..."
  // - "jack and john were removed. This means seats have opened up..."
  // - "jack, john, and justin were removed. This means seats have opened up..."
  const action = isCancelledByHost
    ? attendeeCount === 1
      ? t("was_removed")
      : t("were_removed")
    : attendeeCount === 1
    ? t("has_cancelled")
    : t("have_cancelled");

  const seatsMessage = attendeeCount === 1 ? t("this_means_seat_opened") : t("this_means_seats_opened");
  const subtitle = `${attendeeNames} ${action}. ${seatsMessage}`;

  return (
    <OrganizerScheduledEmail
      title={titleText}
      headerType="xCircle"
      subject="event_cancelled_subject"
      subtitle={<>{subtitle}</>}
      callToAction={null}
      attendeeCancelled
      attendee={props.attendees[0]}
      {...props}
    />
  );
};
