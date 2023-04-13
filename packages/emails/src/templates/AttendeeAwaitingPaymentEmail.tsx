import { CallToAction, CallToActionTable } from "../components";
import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

function ManageLink(props: React.ComponentProps<typeof AttendeeScheduledEmail>) {
  const manageText = props.attendee.language.translate("pay_now");

  if (!props.calEvent.paymentInfo?.link) return null;

  return (
    <CallToActionTable>
      <CallToAction label={manageText} href={props.calEvent.paymentInfo.link} endIconName="linkIcon" />
    </CallToActionTable>
  );
}

export const AttendeeAwaitingPaymentEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => {
  return props.calEvent.paymentInfo?.paymentOption === "HOLD" ? (
    <AttendeeScheduledEmail
      title="meeting_awaiting_payment_method"
      headerType="calendarCircle"
      subject="awaiting_payment_subject"
      callToAction={<ManageLink {...props} />}
      {...props}
    />
  ) : (
    <AttendeeScheduledEmail
      title="meeting_awaiting_payment"
      headerType="calendarCircle"
      subject="awaiting_payment_subject"
      callToAction={<ManageLink {...props} />}
      {...props}
    />
  );
};
