import { getCancelLink } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export function ManageLink(props: { calEvent: CalendarEvent; attendee: Person }) {
  // Only the original attendee can make changes to the event
  // Guests cannot
  const t = props.attendee.language.translate;
  if (
    props.attendee.email === props.calEvent.attendees[0].email ||
    props.calEvent.organizer.email === props.attendee.email
  ) {
    return (
      <div
        style={{
          fontFamily: "Roboto, Helvetica, sans-serif",
          fontSize: "16px",
          fontWeight: 500,
          lineHeight: "0px",
          textAlign: "left",
          color: "#3e3e3e",
        }}>
        <p>
          <>{t("need_to_reschedule_or_cancel")}</>
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <a href={getCancelLink(props.calEvent)} style={{ color: "#3e3e3e" }}>
            <>{t("manage_this_event")}</>
          </a>
        </p>
      </div>
    );
  }

  // Dont have the rights to the manage link
  return null;
}
