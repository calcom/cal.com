import { createHmac } from "crypto";

import { CallToAction, CallToActionTable, Separator } from "../components";
import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

export const OrganizerRequestEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const signedData = `${props.attendee.email}/${props.calEvent.uid}`;
  const signature = createHmac("sha1", CALENDSO_ENCRYPTION_KEY).update(signedData).digest("base64");
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
            label={props.calEvent.organizer.language.translate("accept")}
            href={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/booking/direct/accept/${encodeURIComponent(
              props.attendee.email
            )}/${encodeURIComponent(props.calEvent.uid as string)}/${encodeURIComponent(signature)}`}
          />
          <Separator />
          <CallToAction
            label={props.calEvent.organizer.language.translate("reject")}
            secondary
            href={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/booking/direct/reject/${encodeURIComponent(
              props.attendee.email
            )}/${encodeURIComponent(props.calEvent.uid as string)}/${encodeURIComponent(signature)}`}
          />
        </CallToActionTable>
      }
      {...props}
    />
  );
};
