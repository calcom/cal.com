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
  teamName: string;
  balance: number;

  constructor(user: { name: string; email: string; t: TFunction }, balance: number, teamName: string) {
    super();
    this.user = user;
    this.teamName = teamName;
    this.balance = balance;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    let subject = "";
    subject = `[Action Required] your team ${this.teamName} is running low on credits`;

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: `[Action Required] your team ${this.teamName} is running low on credits`,
      html: await renderEmail("CreditBalanceLowWarningEmail", {
        balance: this.balance,
        teamName: this.teamName,
        user: this.user,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return "You are running low on credits. Please buy more credits.";
  }
}
