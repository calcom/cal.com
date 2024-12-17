import type { IBookingRedirect } from "../../templates/booking-redirect-notification";
import { BaseEmailHtml } from "../components";

export const BookingRedirectEmailNotification = (
  props: IBookingRedirect & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml
      subject={props.language(
        {
          add: "booking_redirect_email_subject",
          update: "booking_redirect_updated_email_subject",
          cancel: "booking_redirect_cancelled_email_subject",
        }[props.action]
      )}
      title={props.language(
        {
          add: "booking_redirect_email_title",
          update: "booking_redirect_updated_email_title",
          cancel: "booking_redirect_cancelled_email_title",
        }[props.action]
      )}>
      <p
        style={{
          color: "black",
          fontSize: "16px",
          lineHeight: "24px",
          fontWeight: "400",
        }}>
        {props.language(
          {
            add: "booking_redirect_email_description",
            update: "booking_redirect_updated_email_description",
            cancel: "booking_redirect_cancelled_email_description",
          }[props.action],
          {
            eventOwner: props.eventOwner,
            dates: props.dates,
            oldDates: props.oldDates ?? "",
            interpolation: { escapeValue: false },
          }
        )}
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "16px",
          }}
        />
      </p>
    </BaseEmailHtml>
  );
};
