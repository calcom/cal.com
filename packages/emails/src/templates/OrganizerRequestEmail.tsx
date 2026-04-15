import { WEBAPP_URL } from "@calcom/lib/constants";
import { symmetricEncrypt } from "@calcom/lib/crypto";

import { CallToAction, Separator, CallToActionTable } from "../components";
import { getFormattedDate } from "../../lib/utils/date-formatting";
import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerRequestEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const date = getFormattedDate(props.calEvent, props.attendee);
  const seedData = {
    bookingUid: props.calEvent.uid,
    userId: props.calEvent.organizer.id,
    platformClientId: props.calEvent.platformClientId,
    platformRescheduleUrl: props.calEvent.platformRescheduleUrl,
    platformCancelUrl: props.calEvent.platformCancelUrl,
    platformBookingUrl: props.calEvent.platformBookingUrl,
  };
  const token = symmetricEncrypt(JSON.stringify(seedData), process.env.CALENDSO_ENCRYPTION_KEY || "");
  //TODO: We should switch to using org domain if available
  const actionHref = `${WEBAPP_URL}/api/link/?token=${encodeURIComponent(token)}`;

  return (
    <OrganizerScheduledEmail
      title={
        props.title || (props.calEvent.recurringEvent?.count
          ? props.calEvent.organizer.language.translate("event_awaiting_approval_recurring")
          : props.calEvent.organizer.language.translate("event_awaiting_approval"))
      }
      subtitle={<>{props.calEvent.organizer.language.translate("someone_requested_an_event")}</>}
      headerType="calendarCircle"
      subject={props.calEvent.organizer.language.translate("event_awaiting_approval_subject", {
        title: props.calEvent.title,
        date,
      })}
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
