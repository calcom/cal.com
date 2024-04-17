import { getCancelLink, getRescheduleLink, getBookingUrl } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export function ManageLink(props: { calEvent: CalendarEvent; attendee: Person }) {
  // Only the original attendee can make changes to the event
  // Guests cannot
  const t = props.attendee.language.translate;
  const cancelLink = getCancelLink(props.calEvent);
  const rescheduleLink = getRescheduleLink(props.calEvent);
  const bookingLink = getBookingUrl(props.calEvent);

  const isOriginalAttendee = props.attendee.email === props.calEvent.attendees[0]?.email;
  const isOrganizer = props.calEvent.organizer.email === props.attendee.email;
  const hasCancelLink = Boolean(cancelLink);
  const hasRescheduleLink = Boolean(rescheduleLink);
  const hasBookingLink = Boolean(bookingLink);
  const isRecurringEvent = props.calEvent.recurringEvent;

  if (
    (isOriginalAttendee || isOrganizer) &&
    (hasCancelLink || (!isRecurringEvent && hasRescheduleLink) || hasBookingLink)
  ) {
    return (
      <div
        style={{
          fontFamily: "Roboto, Helvetica, sans-serif",
          fontSize: "16px",
          fontWeight: 500,
          lineHeight: "0px",
          textAlign: "left",
          color: "#101010",
        }}>
        <p
          style={{
            fontWeight: 400,
            lineHeight: "24px",
            textAlign: "center",
            width: "100%",
          }}>
          <>{t("need_to_make_a_change")}</>

          {!isRecurringEvent && hasRescheduleLink && (
            <span>
              <a
                href={rescheduleLink}
                style={{
                  color: "#374151",
                  marginLeft: "5px",
                  marginRight: "5px",
                  textDecoration: "underline",
                }}>
                <>{t("reschedule")}</>
              </a>
              {hasCancelLink && <>{t("or_lowercase")}</>}
            </span>
          )}
          {hasCancelLink && (
            <span>
              <a
                href={cancelLink}
                style={{
                  color: "#374151",
                  marginLeft: "5px",
                  textDecoration: "underline",
                }}>
                <>{t("cancel")}</>
              </a>
            </span>
          )}

          {!hasCancelLink && (isRecurringEvent || !hasRescheduleLink) && hasBookingLink && (
            <span>
              <a
                href={bookingLink}
                style={{
                  color: "#374151",
                  marginLeft: "5px",
                  textDecoration: "underline",
                }}>
                <>{t("check_here")}</>
              </a>
            </span>
          )}
        </p>
      </div>
    );
  }

  // Don't have the rights to the manage link
  return null;
}
