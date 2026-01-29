import type { TFunction } from "i18next";

import { APP_NAME, SENDER_NAME } from "@calcom/lib/constants";

import { BaseEmailHtml } from "../components";

export type SmtpTestEmailProps = {
  language: TFunction;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
};

export const SmtpTestEmail = (props: SmtpTestEmailProps & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  return (
    <BaseEmailHtml subject={props.language("smtp_test_email_subject", { appName: APP_NAME })}>
      <p
        style={{
          fontWeight: 600,
          fontSize: "32px",
          lineHeight: "38px",
        }}>
        <>{props.language("smtp_test_email_header")}</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{props.language("smtp_test_email_body", { appName: APP_NAME })}</>
      </p>
      <div
        style={{
          background: "#f3f4f6",
          padding: "16px",
          borderRadius: "8px",
          margin: "20px 0",
        }}>
        <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>
          <>{props.language("smtp_test_email_config_details")}</>
        </p>
        <p style={{ margin: "0", color: "#111827" }}>
          <strong>{props.language("from_email")}:</strong> {props.fromEmail}
        </p>
        <p style={{ margin: "4px 0 0 0", color: "#111827" }}>
          <strong>{props.language("smtp_host")}:</strong> {props.smtpHost}
        </p>
        <p style={{ margin: "4px 0 0 0", color: "#111827" }}>
          <strong>{props.language("smtp_port")}:</strong> {props.smtpPort}
        </p>
      </div>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>
          {props.language("happy_scheduling")}, <br />
          {props.language("the_calcom_team", { companyName: SENDER_NAME })}
        </>
      </p>
    </BaseEmailHtml>
  );
};
