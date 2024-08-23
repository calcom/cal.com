import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, Separator, CallToActionTable } from "../components";
import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerRequestEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const userId = props.calEvent.organizer.id;
  const token = props.calEvent.oneTimePassword;
  const bookingUid = props.calEvent.uid;
  //TODO: We should switch to using org domain if available
  const actionHref = `${WEBAPP_URL}/api/verify-booking-token/?token=${token}&userId=${userId}&bookingUid=${bookingUid}`;
  const rejectLink = new URL(`${props.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${bookingUid}`);
  rejectLink.searchParams.append("reject", "true");
  return (
    <OrganizerScheduledEmail
      title={
        props.title || props.calEvent.recurringEvent?.count
          ? "event_awaiting_approval_recurring"
          : "event_awaiting_approval"
      }
      subtitle={<>{props.calEvent.organizer.language.translate("someone_requested_an_event")}</>}
      headerType="calendarCircle"
      subject="event_awaiting_approval_subject"
      callToAction={
        <CallToActionTable>
          <CallToAction
            label={props.calEvent.organizer.language.translate("confirm")}
            href={`${actionHref}&action=accept`}
            startIconName="confirmIcon"
          />
          <Separator />
          <CallToAction
            label={props.calEvent.organizer.language.translate("reject")}
            href={`${actionHref}&action=reject`}
            startIconName="rejectIcon"
            secondary
          />
          <Separator />
          <CallToAction
            label={props.calEvent.organizer.language.translate("reject_with_reason")}
            href={rejectLink.toString()}
            startIconName="rejectIcon"
            secondary
          />
        </CallToActionTable>
      }
      {...props}
    />
  );
};
