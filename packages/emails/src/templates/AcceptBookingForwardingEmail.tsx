import type { IBookingForwarding } from "../../templates/accept-booking-forwarding";
import { BaseEmailHtml } from "../components";

export const AcceptBookingForwardingEmail = (
  props: IBookingForwarding & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml
      subject={props.language("accept_booking_forwarding_email_subject")}
      title={props.language("accept_booking_forwarding_email_title")}>
      <p
        style={{
          color: "black",
          fontSize: "16px",
          lineHeight: "24px",
          fontWeight: "400",
        }}>
        {props.language("accept_booking_forwarding_email_description", {
          toName: props.toName,
        })}
        {props.dates}
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "16px",
          }}>
          <a href={props.acceptLink} target="_blank">
            <button
              style={{
                backgroundColor: "black",
                color: "white",
                borderRadius: "4px",
                padding: "8px 16px",
                marginRight: "16px",
              }}>
              {props.language("accept")}
            </button>
          </a>
          <a href={props.rejectLink} target="blank">
            <button
              style={{
                backgroundColor: "white",
                color: "black",
                borderRadius: "4px",
                padding: "8px 16px",
              }}>
              {props.language("reject")}
            </button>
          </a>
        </div>
      </p>
    </BaseEmailHtml>
  );
};
