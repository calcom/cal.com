import { TFunction } from "next-i18next";

import type { Referrer } from "@calcom/types/Referral";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class ReferralEmail extends BaseEmail {
  refereeEmail: string;
  referrer: Referrer;

  constructor(refereeEmail: string, referrer: Referrer) {
    super();
    this.refereeEmail = refereeEmail;
    this.referrer = referrer;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: this.refereeEmail,
      from: `Cal.com <${this.getMailerOptions().from}>`,
      subject: "This is a referral",
      html: renderEmail("ReferralEmail", this.referrer),
      text: "",
    };
  }
}
