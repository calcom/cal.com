import type { IBookingRedirect } from "../../templates/booking-redirect-notification";
import { BaseEmailHtml } from "../components";

export const BookingRedirectEmailNotification = (
  props: IBookingRedirect & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml
      subject={props.language("booking_redirect_email_subject")}
      title={props.language("booking_redirect_email_title")}>
      <p
        style={{
          color: "black",
          fontSize: "16px",
          lineHeight: "24px",
          fontWeight: "400",
        }}>
        {props.language("booking_redirect_email_description", {
          toName: props.toName,
        })}
        {props.dates}
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
