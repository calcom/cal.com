import { APP_NAME } from "@calcom/lib/constants";
import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";
import type { BaseScheduledEmail } from "./BaseScheduledEmail";

export function formatInTimeZone(
  utcDate: string | Date,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(utcDate));
}

export const PaymentNotProcessableEmail = (
  props: {
    user: {
      timeZone: string;
      name: string;
      email: string;
    };
    attendee: {
      name: string;
      email: string;
    };
    booking: {
      title: string;
      startTime: string;
      amount: string;
      currency: string;
      paymentDate: string;
      paymentId: string;
    };
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { user, attendee, booking } = props;

  const startTime = formatInTimeZone(booking.startTime, user.timeZone);

  const paymentDate = formatInTimeZone(booking.paymentDate, user.timeZone, { timeStyle: undefined });

  return (
    <V2BaseEmailHtml subject={`Refund Could Not Be Processed - ${APP_NAME}`}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>Hi {user.name},</p>

      <p style={{ fontWeight: 400, lineHeight: "24px" }}>Refund Not Processable</p>

      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        {attendee.name} has cancelled their booking for "{booking.title}" scheduled for {startTime}. However,
        we were unable to process the refund automatically.
      </p>

      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        The refund amount of {booking.amount} {booking.currency} cannot be processed because the payment '{booking.paymentId}' 
         was made on {paymentDate}, which exceeds the 6-month refund window required by our
        payment processor.
      </p>

      <p style={{ fontWeight: 600, lineHeight: "24px" }}>
        To resolve this matter, you may need to issue a manual refund directly to the attendee or discuss
        alternative arrangements.
      </p>

      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        <strong>Attendee Contact Information:</strong>
        <br />
        Name: {attendee.name}
        <br />
        Email: {attendee.email}
      </p>
    </V2BaseEmailHtml>
  );
};
