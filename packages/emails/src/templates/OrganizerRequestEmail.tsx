import { WEBAPP_URL } from "@calcom/lib/constants";
import { symmetricEncrypt } from "@calcom/lib/crypto";

import { CallToAction, Separator, CallToActionTable } from "../components";
import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerRequestEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const seedData = { bookingUid: props.calEvent.uid, userId: props.calEvent.organizer.id };
  const token = symmetricEncrypt(JSON.stringify(seedData), process.env.CALENDSO_ENCRYPTION_KEY || "");
  const actionHref = `${WEBAPP_URL}/api/link/?token=${encodeURIComponent(token)}`;
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
        </CallToActionTable>
      }
      {...props}
    />
  );
};
