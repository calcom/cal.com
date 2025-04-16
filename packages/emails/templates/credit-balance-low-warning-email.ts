import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class CreditBalanceLowWarningEmail extends BaseEmail {
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  teamName?: string;
  balance: number;

  constructor(user: { name: string; email: string; t: TFunction }, balance: number, teamName?: string) {
    super();
    this.user = user;
    this.teamName = teamName;
    this.balance = balance;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    let subject = "";
    if (this.teamName) {
      subject = `[Action Required] your team ${this.teamName} is running low on credits`;
    } else if (this.user) {
      subject = `[Action Required] you are running low on credits`;
    }

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: [this.user.email, "carina@cal.com"], //test if this is on email and I see who also got it
      subject,
      html: await renderEmail("CreditBalanceLowWarningEmail", {
        user: this.user,
        balance: this.balance,
        teamName: this.teamName,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return "You are running low on credits. Please buy more credits.";
  }
}
