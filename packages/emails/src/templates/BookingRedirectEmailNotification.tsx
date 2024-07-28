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
          edit: "booking_redirect_edit_email_subject",
          cancel: "booking_redirect_cancel_email_subject",
        }[props.action]
      )}
      title={props.language(
        {
          add: "booking_redirect_email_title",
          edit: "booking_redirect_edit_email_title",
          cancel: "booking_redirect_cancel_email_title",
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
            edit: "booking_redirect_edit_email_description",
            cancel: "booking_redirect_cancel_email_description",
          }[props.action],
          {
            toName: props.toName,
            dates: props.dates,
            oldDates: props.oldDates ?? "",
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
