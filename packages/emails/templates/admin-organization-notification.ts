import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type OrganizationNotification = {
  t: TFunction;
  instanceAdmins: { email: string }[];
  ownerEmail: string;
  orgSlug: string;
  webappIPAddress: string;
};

export default class AdminOrganizationNotification extends BaseEmail {
  input: OrganizationNotification;

  constructor(input: OrganizationNotification) {
    super();
    this.name = "SEND_ADMIN_ORG_NOTIFICATION";
    this.input = input;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: this.input.instanceAdmins.map((admin) => admin.email).join(","),
      subject: `${this.input.t("admin_org_notification_email_subject")}`,
      html: await renderEmail("AdminOrganizationNotificationEmail", {
        orgSlug: this.input.orgSlug,
        webappIPAddress: this.input.webappIPAddress,
        language: this.input.t,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `${this.input.t("hi_admin")}, ${this.input.t("admin_org_notification_email_title").toLowerCase()}
    ${this.input.t("admin_org_notification_email_body")}`.trim();
  }
}
