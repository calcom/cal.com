import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import BaseEmail from "./_base-email";

export default class OrganizationEmailVerification extends BaseEmail {
  email: string;
  code: string;
  t: TFunction;

  constructor(email: string, code: string, t: TFunction) {
    super();
    this.email = email;
    this.code = code;
    this.t = t;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: this.email,
      subject: `Verify your email to create an organization`,
      html: `<b>Code:</b> ${this.code}`,
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `<b>Code:</b> ${this.code}`;
  }
}
