import { CallToAction, CallToActionTable } from "../components";
import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerRequestEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const t = props.calEvent.organizer.language.translate;
  return (
    <OrganizerScheduledEmail
      title={
        props.title || props.calEvent.recurringEvent?.count
          ? "event_awaiting_approval_recurring"
          : "event_awaiting_approval"
      }
      subtitle={<>{t("someone_requested_an_event")}</>}
      headerType="calendarCircle"
      subject="event_awaiting_approval_subject"
      callToAction={
        <CallToActionTable>
          <CallToAction
            label={t("confirm_or_reject_request")}
            href={
              process.env.NEXT_PUBLIC_WEBAPP_URL +
              (props.calEvent.recurringEvent?.count ? "/bookings/recurring" : "/bookings/upcoming")
            }
          />
        </CallToActionTable>
      }
      {...props}
    />
  );
};
