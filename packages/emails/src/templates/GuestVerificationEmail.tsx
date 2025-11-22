import type { TFunction } from "i18next";

import { BaseEmailHtml, CallToAction } from "../components";

export type GuestVerificationEmailProps = {
  language: TFunction;
  guestEmail: string;
  bookingTitle: string;
  bookingDate: string;
  verificationLink: string;
};

export const GuestVerificationEmail = (props: GuestVerificationEmailProps) => {
  return (
    <BaseEmailHtml subject={props.language("guest_verification_verify_email_to_join")}>
      <p style={{ fontWeight: 600, fontSize: "32px", lineHeight: "38px" }}>
        {props.language("guest_verification_verify_your_email")}
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        {props.language("guest_verification_youve_been_invited_as_guest")}
      </p>
      <p style={{ fontWeight: 600, fontSize: "18px", lineHeight: "24px", margin: "8px 0" }}>
        {props.bookingTitle}
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", color: "#666" }}>
        {props.bookingDate}
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginTop: "24px" }}>
        {props.language("guest_verification_to_confirm_attendance")}
      </p>
      <CallToAction label={props.language("guest_verification_verify_email_button")} href={props.verificationLink} />
      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px", fontSize: "12px", color: "#999" }}>
          {props.language("guest_verification_or_copy_paste_link")}
          <br />
          <a href={props.verificationLink} style={{ color: "#666", wordBreak: "break-all" }}>{props.verificationLink}</a>
        </p>
      </div>
      <p style={{ fontWeight: 400, lineHeight: "24px", fontSize: "14px", color: "#999", marginTop: "24px" }}>
        {props.language("guest_verification_link_expires_48h")}
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", fontSize: "14px", color: "#999" }}>
        {props.language("guest_verification_if_not_expecting_invitation")}
      </p>
    </BaseEmailHtml>
  );
};
