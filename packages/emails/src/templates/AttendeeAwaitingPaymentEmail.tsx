import { CallToAction, CallToActionTable } from "../components";
import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

function ManageLink(props: React.ComponentProps<typeof AttendeeScheduledEmail>) {
  const manageText = props.attendee.language.translate("pay_now");

  if (!props.calEvent.paymentInfo?.link) return null;

  return (
    <CallToActionTable>
      <CallToAction label={manageText} href={props.calEvent.paymentInfo.link} />
    </CallToActionTable>
  );
}

export const AttendeeAwaitingPaymentEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="meeting_awaiting_payment"
    headerType="calendarCircle"
    subject="awaiting_payment_subject"
    callToAction={<ManageLink {...props} />}
    {...props}
  />
);
