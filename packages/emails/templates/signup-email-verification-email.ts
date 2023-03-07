import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class SignupEmailVerificationEmail extends BaseEmail {
  verificationToken: string;
  email: string;

  constructor(email: string, verificationToken: string) {
    super();
    this.verificationToken = verificationToken;
    this.email = email;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.email}`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      // Currently can not get locale from signup page
      subject: `${APP_NAME} - Confirm your email address`,
      html: renderEmail("SignupEmailVerification", {
        verificationToken: this.verificationToken,
        email: this.email,
      }),
      //   text: this.getTextBody(),
    };
  }
}
