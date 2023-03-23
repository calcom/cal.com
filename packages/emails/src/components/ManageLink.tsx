import { getCancelLink, getRescheduleLink } from "@calcom/lib/CalEventParser";
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
          color: "#101010",
        }}>
        <p
          style={{
            fontWeight: 400,
            lineHeight: "24px",
            display: "flex",
            justifyContent: "center",
            width: "100%",
            gap: "8px",
          }}>
          <>{t("need_to_make_a_change")}</>
          {!props.calEvent.recurringEvent && (
            <>
              <a
                href={getRescheduleLink(props.calEvent)}
                style={{ color: "#374151", marginLeft: "5px", marginRight: "5px" }}>
                <>{t("reschedule")}</>
              </a>
              <>{t("or_lowercase")}</>
            </>
          )}
          <a href={getCancelLink(props.calEvent)} style={{ color: "#374151", marginLeft: "5px" }}>
            <>{t("cancel")}</>
          </a>
        </p>
      </div>
    );
  }

  // Dont have the rights to the manage link
  return null;
}
