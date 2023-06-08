import type { TFunction } from "next-i18next";

import { APP_NAME, COMPANY_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type EmailVerifyLink = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  verificationEmailLink: string;
};

export default class AccountVerifyEmail extends BaseEmail {
  verifyAccountInput: EmailVerifyLink;

  constructor(passwordEvent: EmailVerifyLink) {
    super();
    this.name = "SEND_ACCOUNT_VERIFY_EMAIL";
    this.verifyAccountInput = passwordEvent;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.verifyAccountInput.user.name} <${this.verifyAccountInput.user.email}>`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.verifyAccountInput.language("verify_email_subject", {
        appName: APP_NAME,
      }),
      html: renderEmail("VerifyAccountEmail", this.verifyAccountInput),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
${this.verifyAccountInput.language("verify_email_subject", { appName: APP_NAME })}
${this.verifyAccountInput.language("verify_email_email_header")}
${this.verifyAccountInput.language("hi_user_name", { name: this.verifyAccountInput.user.name })},
${this.verifyAccountInput.language("verify_email_email_body", { appName: APP_NAME })}
${this.verifyAccountInput.language("verify_email_email_link_text")}
${this.verifyAccountInput.verificationEmailLink}
${this.verifyAccountInput.language("happy_scheduling")} ${this.verifyAccountInput.language(
      "the_calcom_team",
      { companyName: COMPANY_NAME }
    )}
`.replace(/(<([^>]+)>)/gi, "");
  }
}
