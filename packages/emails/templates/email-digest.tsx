import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type DigestEmailType = {
  language: TFunction;
  user: {
    email: string;
  };
  totalHostedEvents: number;
  totalHostedEventsDuration: number;
  totalAttendedEvents: number;
  totalAttendedEventsDuration: number;
  topBookedEvents: [string, number][];
  paymentsMap: Map<string, number>;
  uniqueBookedUsers: Set<string>;
  uniqueBookedTimeZones: Set<string>;
};

export default class DigestEmail extends BaseEmail {
  digestEmailInput: DigestEmailType;

  constructor(passwordEvent: DigestEmailType) {
    super();
    this.name = "SEND_ACCOUNT_VERIFY_EMAIL";
    this.digestEmailInput = passwordEvent;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.digestEmailInput.user.email} <${this.digestEmailInput.user.email}>`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.digestEmailInput.language("30_day_email_digest", {
        appName: APP_NAME,
      }),
      html: renderEmail("EmailDigest", this.digestEmailInput),
    };
  }
}
