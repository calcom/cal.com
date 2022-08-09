import { TFunction } from "next-i18next";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class ReferralEmail extends BaseEmail {
  constructor(refereeEmail, referrer) {
    super();
    this.refereeEmail = refereeEmail;
    this.referrer = referrer;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: "testing@test.com",
      from: `Cal.com <${this.getMailerOptions().from}>`,
      subject: "This is a referral",
      html: renderEmail("ReferralEmail", {
        referrer: this.referrer,
      }),
      text: "",
    };
  }
}
