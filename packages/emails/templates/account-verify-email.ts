import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

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

export const PASSWORD_RESET_EXPIRY_HOURS = 6;

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
      subject: this.verifyAccountInput.language("reset_password_subject", {
        appName: APP_NAME,
      }),
      html: renderEmail("VerifyAccountEmail", this.verifyAccountInput),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
${this.verifyAccountInput.language("reset_password_subject", { appName: APP_NAME })}
${this.verifyAccountInput.language("hi_user_name", { name: this.verifyAccountInput.user.name })},
${this.verifyAccountInput.language("someone_requested_password_reset")}
${this.verifyAccountInput.language("change_password")}: ${this.verifyAccountInput.verificationEmailLink}
${this.verifyAccountInput.language("password_reset_instructions")}
${this.verifyAccountInput.language("have_any_questions")} ${this.verifyAccountInput.language(
      "contact_our_support_team"
    )}
`.replace(/(<([^>]+)>)/gi, "");
  }
}
