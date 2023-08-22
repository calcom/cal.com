import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { BaseEmailHtml } from "../components";

type AdminOrganizationNotification = {
  language: TFunction;
  orgSlug: string;
};

export const AdminOrganizationNotificationEmail = ({ orgSlug, language }: AdminOrganizationNotification) => {
  return (
    <BaseEmailHtml subject={language("admin_org_notification_email_subject", { appName: APP_NAME })}>
      <p
        style={{
          fontWeight: 600,
          fontSize: "32px",
          lineHeight: "38px",
        }}>
        <>{language("admin_org_notification_email_title")}</>
      </p>
      <p style={{ fontWeight: 400 }}>
        <>{language("hi_admin")}!</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{language("admin_org_notification_email_body", { orgSlug })}</>
      </p>
    </BaseEmailHtml>
  );
};
