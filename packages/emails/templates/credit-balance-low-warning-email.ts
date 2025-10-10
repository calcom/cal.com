/* eslint-disable import/no-cycle */
import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class CreditBalanceLowWarningEmail extends BaseEmail {
  user: {
    id: number;
    name: string;
    email: string;
    t: TFunction;
  };
  team?: {
    id: number;
    name: string;
  };
  balance: number;
  autoRechargeEnabled: boolean;

  constructor({
    user,
    balance,
    team,
    autoRechargeEnabled = false,
  }: {
    user: { id: number; name: string | null; email: string; t: TFunction };
    balance: number;
    team?: { id: number; name: string | null };
    autoRechargeEnabled?: boolean;
  }) {
    super();
    this.user = { ...user, name: user.name || "" };
    this.team = team ? { ...team, name: team.name || "" } : undefined;
    this.balance = balance;
    this.autoRechargeEnabled = autoRechargeEnabled;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.team
        ? this.user.t("team_credits_low_warning", { teamName: this.team.name })
        : this.user.t("user_credits_low_warning"),
      html: await renderEmail("CreditBalanceLowWarningEmail", {
        balance: this.balance,
        team: this.team,
        user: this.user,
        autoRechargeEnabled: this.autoRechargeEnabled,
        calEvent: undefined,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    if (this.autoRechargeEnabled) {
      return "Your team is running low on credits. Auto-recharge will be triggered soon.";
    }
    return "Your team is running low on credits. Please buy more credits.";
  }
}
