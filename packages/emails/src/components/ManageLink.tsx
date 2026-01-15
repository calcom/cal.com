import {
  getBookingUrl,
  getCancelLink,
  getEditDetailsLink,
  getRescheduleLink,
} from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

function getManageLinkData(props: { calEvent: CalendarEvent; attendee: Person }) {
  const t = props.attendee.language.translate;
  const cancelLink = getCancelLink(props.calEvent, props.attendee);
  const rescheduleLink = getRescheduleLink({ calEvent: props.calEvent, attendee: props.attendee });
  const bookingLink = getBookingUrl(props.calEvent);
  const editDetailsLink = getEditDetailsLink({ calEvent: props.calEvent, attendee: props.attendee });

  const isOriginalAttendee = props.attendee.email === props.calEvent.attendees[0]?.email;
  const isOrganizer = props.calEvent.organizer.email === props.attendee.email;
  const hasCancelLink = Boolean(cancelLink) && !props.calEvent.disableCancelling;
  const hasRescheduleLink = Boolean(rescheduleLink) && !props.calEvent.disableRescheduling;
  const hasBookingLink = Boolean(bookingLink);
  const hasEditDetailsLink = Boolean(editDetailsLink) && isOriginalAttendee && !isOrganizer;
  const isRecurringEvent = props.calEvent.recurringEvent;
  const shouldDisplayRescheduleLink = Boolean(hasRescheduleLink && !isRecurringEvent);
  const isTeamMember = props.calEvent.team?.members.some((member) => props.attendee.email === member.email);

  const isVisible =
    (isOriginalAttendee || isOrganizer || isTeamMember) &&
    (hasCancelLink || (!isRecurringEvent && hasRescheduleLink) || hasBookingLink || hasEditDetailsLink);

  return {
    t,
    cancelLink,
    rescheduleLink,
    bookingLink,
    editDetailsLink,
    shouldDisplayRescheduleLink,
    hasCancelLink,
    hasEditDetailsLink,
    hasBookingLink,
    isVisible,
    platformClientId: props.calEvent.platformClientId,
  };
}

export function ManageLink(props: { calEvent: CalendarEvent; attendee: Person }) {
  const {
    t,
    cancelLink,
    rescheduleLink,
    bookingLink,
    editDetailsLink,
    shouldDisplayRescheduleLink,
    hasCancelLink,
    hasEditDetailsLink,
    hasBookingLink,
    isVisible,
    platformClientId,
  } = getManageLinkData(props);

  if (!isVisible) {
    return null;
  }

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
        {(shouldDisplayRescheduleLink || hasCancelLink || hasEditDetailsLink) && (
          <>{t("need_to_make_a_change")}</>
        )}
        {shouldDisplayRescheduleLink && (
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
            {(hasCancelLink || hasEditDetailsLink) && <>{t("or_lowercase")}</>}
          </span>
        )}
        {hasCancelLink && (
          <span>
            <a
              href={cancelLink}
              style={{
                color: "#374151",
                marginLeft: "5px",
                marginRight: hasEditDetailsLink ? "5px" : "0px",
                textDecoration: "underline",
              }}>
              <>{t("cancel")}</>
            </a>
            {hasEditDetailsLink && <>{t("or_lowercase")}</>}
          </span>
        )}

        {/* Edit Details link - only for original attendees, not organizers */}
        {hasEditDetailsLink && (
          <span>
            <a
              href={editDetailsLink}
              style={{
                color: "#374151",
                marginLeft: "5px",
                textDecoration: "underline",
              }}>
              <>{t("edit_details") || "Edit Details"}</>
            </a>
          </span>
        )}

        {platformClientId && hasBookingLink && (
          <span>
            {(hasCancelLink || shouldDisplayRescheduleLink || hasEditDetailsLink) && (
              <span
                style={{
                  marginLeft: "5px",
                }}>
                {t("or_lowercase")}
              </span>
            )}
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
