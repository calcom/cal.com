import { DEMO_URL, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import { V2BaseEmailHtml, CallToAction } from "../components";
import ServerTrans from "@calcom/lib/components/ServerTrans";

import { BaseEmailHtml } from "../components";

export type BookingExportEmailProps = {
  user: {
    fullName: string;
  };
  receiverEmail: string;
  csvContent: string;
};

export const BookingExportEmail = (
  props: BookingExportEmailProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  return (
    <V2BaseEmailHtml
     subject={`Your Booking Data is Attached, ${props.user.fullName}`}>
      <p style={{ fontWeight: 400, lineHeight: "24px", margin: "0 0 20px" }}>Hi {props.user.fullName}, 👋</p>
      <p style={{ fontWeight: 400, lineHeight: "24px", margin: "0 0 20px" }}>
        We’ve compiled your booking data into a CSV file and attached it to this email for your convenience.
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", margin: "0 0 20px" }}>
        Please find the attached CSV file containing all your booking details.
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", margin: "0 0 20px" }}>
        If you have any questions or need assistance with the file, feel free to reach out.
      </p>

      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          If you need further assistance or would like a{" "}
          <a href={DEMO_URL} style={{ color: "#3E3E3E", textDecoration: "underline" }}>
            demo
          </a>
          , feel free to{" "}
          <a
            href={`mailto:${SUPPORT_MAIL_ADDRESS}`}
            style={{ color: "#3E3E3E" }}
            target="_blank"
            rel="noreferrer">
            contact our support team
          </a>
          .
          <br />
          Happy organizing your bookings 📅.
        </p>
      </div>
    </V2BaseEmailHtml>
  );
};
