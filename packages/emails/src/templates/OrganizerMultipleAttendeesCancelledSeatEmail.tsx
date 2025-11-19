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

  let titleKey = "";
  if (attendeeCount === 1) {
    titleKey = isCancelledByHost ? "attendee_was_removed" : "attendee_no_longer_attending";
  } else {
    titleKey = isCancelledByHost ? "some_attendees_were_removed" : "some_attendees_no_longer_attending";
  }

  const titleText = attendeeCount === 1 ? t(titleKey) : t(titleKey);
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
