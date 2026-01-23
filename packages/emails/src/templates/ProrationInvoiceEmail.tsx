import type { TFunction } from "i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";

export type ProrationInvoiceEmailProps = {
  language: TFunction;
  to: string;
  teamName: string;
  seatCount: number;
  amountFormatted: string;
  invoiceUrl: string;
  isReminder: boolean;
};

export const ProrationInvoiceEmail = (
  props: ProrationInvoiceEmailProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  const { language, teamName, seatCount, amountFormatted, invoiceUrl, isReminder } = props;

  const subject = isReminder
    ? language("proration_invoice_reminder_subject", { teamName })
    : language("proration_invoice_email_subject", { teamName });

  const heading = isReminder
    ? language("proration_invoice_reminder_heading")
    : language("proration_invoice_email_heading");

  const body = isReminder
    ? language("proration_invoice_reminder_body", { teamName })
    : language("proration_invoice_email_body", { seatCount, teamName });

  return (
    <V2BaseEmailHtml subject={subject}>
      <p style={{ fontSize: "24px", marginBottom: "16px", textAlign: "center" }}>{heading}</p>

      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "16px",
          marginTop: "32px",
        }}>
        {body}
      </p>

      {!isReminder && (
        <p
          style={{
            fontWeight: 500,
            lineHeight: "24px",
            marginBottom: "32px",
          }}>
          {language("proration_invoice_email_amount", { amount: amountFormatted })}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
        <CallToAction label={language("proration_invoice_email_view_invoice")} href={invoiceUrl} />
      </div>

      <div className="">
        <p
          style={{
            fontWeight: 400,
            lineHeight: "24px",
            marginBottom: "32px",
            marginTop: "32px",
          }}>
          {language("email_no_user_signoff", { appName: APP_NAME })}
        </p>
      </div>

      <div style={{ borderTop: "1px solid #E1E1E1", marginTop: "32px", paddingTop: "32px" }}>
        <p style={{ fontWeight: 400, margin: 0 }}>
          {language("have_any_questions")}{" "}
          <a href="mailto:support@cal.com" style={{ color: "#3E3E3E" }} target="_blank" rel="noreferrer">
            {language("contact")}
          </a>{" "}
          {language("our_support_team")}
        </p>
      </div>
    </V2BaseEmailHtml>
  );
};
