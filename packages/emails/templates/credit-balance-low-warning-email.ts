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
  team: {
    id: number;
    name: string;
  };
  balance: number;

  constructor(
    user: { name: string; email: string; t: TFunction },
    balance: number,
    team: { id: number; name: string }
  ) {
    super();
    this.user = user;
    this.team = team;
    this.balance = balance;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.user.t("team_credits_low_warning", { teamName: this.team.name }),
      html: await renderEmail("CreditBalanceLowWarningEmail", {
        balance: this.balance,
        team: this.team,
        user: this.user,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return "Your team is running low on credits. Please buy more credits.";
  }
}
