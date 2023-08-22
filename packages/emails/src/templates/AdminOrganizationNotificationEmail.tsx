import { Trans, type TFunction } from "next-i18next";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

type AdminOrganizationNotification = {
  language: TFunction;
  orgSlug: string;
};

export const AdminOrganizationNotificationEmail = ({ orgSlug, language }: AdminOrganizationNotification) => {
  return (
    <BaseEmailHtml
      subject={language("admin_org_notification_email_subject", { appName: APP_NAME })}
      callToAction={
        <CallToAction
          label={language("admin_org_notification_email_cta")}
          href={`${WEBAPP_URL}/settings/admin/organizations`}
          endIconName="white-arrow-right"
        />
      }>
      <p
        style={{
          fontWeight: 600,
          fontSize: "24px",
          lineHeight: "38px",
        }}>
        <>{language("admin_org_notification_email_title")}</>
      </p>
      <p style={{ fontWeight: 400 }}>
        <>{language("hi_admin")}!</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <Trans i18nKey="admin_org_notification_email_body" t={language} values={{ orgSlug }}>
          An organization with slug {`"${orgSlug}"`} was created.
          <br />
          <br />
          Please be sure to configure your DNS registry to point the subdomain corresponding to the new
          organization to where the main app is running. Otherwise the organization will not work.
          <br />
          <br />
          Once you configure the subdomain, please mark the DNS configuration as done in Organizations Admin
          Settings.
        </Trans>
      </p>
    </BaseEmailHtml>
  );
};
