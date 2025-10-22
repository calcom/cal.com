import { APP_NAME } from "@calcom/lib/constants";

import type { PendingGuestConfirmation as PendingGuestConfirmationType } from "../../lib/types/email-types";
import { BaseEmailHtml, CallToAction } from "../components";

export const PendingGuestConfirmation = (
  props: PendingGuestConfirmationType & { confirmationUrl: string; code: string } & Partial<
      React.ComponentProps<typeof BaseEmailHtml>
    >
) => {
  return (
    <BaseEmailHtml
      subject={props.language("confirm_guest_attendance", {
        eventName: props.booking.title,
        appName: APP_NAME,
      })}>
      <p
        style={{
          fontWeight: 600,
          fontSize: "32px",
          lineHeight: "38px",
        }}>
        <>{props.language("confirm_guest_attendance", { eventName: props.booking.title })}</>
      </p>
      <p style={{ fontWeight: 400 }}>
        <>{props.language("hi_user_name", { name: props.guest.name || "Guest" })}!</>
      </p>
      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            {props.language("pending_guest_confirmation_body", {
              organizerName: props.organizer.name,
              eventName: props.booking.title,
            })}
          </>
        </p>
      </div>
      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            {props.language("confirmation_code")}: <strong>{props.code}</strong>
          </>
        </p>
      </div>
      <div style={{ marginTop: "24px" }}>
        <CallToAction label={props.language("confirm_attendance")} href={props.confirmationUrl} />
      </div>
      <div style={{ lineHeight: "6px", marginTop: "24px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px", fontSize: "12px", color: "#666" }}>
          <>{props.language("code_expires_in", { minutes: 15 })}</>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
