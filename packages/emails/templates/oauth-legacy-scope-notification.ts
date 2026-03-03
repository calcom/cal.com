import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type OAuthLegacyScopeNotification = {
  t: TFunction;
  userEmail: string;
  userName: string | null;
  clientName: string;
  clientId: string;
};

export default class OAuthLegacyScopeNotificationEmail extends BaseEmail {
  input: OAuthLegacyScopeNotification;

  constructor(input: OAuthLegacyScopeNotification) {
    super();
    this.name = "SEND_OAUTH_LEGACY_SCOPE_NOTIFICATION";
    this.input = input;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.input.userEmail,
      subject: `${this.input.t("oauth_legacy_scope_email_subject", { clientName: this.input.clientName })}`,
      html: await renderEmail("OAuthLegacyScopeNotificationEmail", {
        userName: this.input.userName,
        clientName: this.input.clientName,
        clientId: this.input.clientId,
        language: this.input.t,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `${this.input.t("oauth_legacy_scope_email_title", { clientName: this.input.clientName })}

${this.input.t("oauth_legacy_scope_email_body")}

${this.input.t("oauth_legacy_scope_email_action")}`.trim();
  }
}
