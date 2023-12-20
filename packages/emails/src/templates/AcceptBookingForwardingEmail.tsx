import type { IBookingForwarding } from "../../templates/accept-booking-forwarding";
import { BaseEmailHtml, CallToAction, CallToActionTable, Separator } from "../components";

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
          <CallToActionTable>
            <CallToAction
              label={props.language("confirm")}
              href={props.acceptLink}
              startIconName="confirmIcon"
            />
            <Separator />
            <CallToAction
              label={props.language("reject")}
              href={props.rejectLink}
              startIconName="rejectIcon"
              secondary
            />
          </CallToActionTable>
        </div>
      </p>
    </BaseEmailHtml>
  );
};
