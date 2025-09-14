/* eslint-disable import/no-cycle */
import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class CreditBalanceLimitReachedEmail extends BaseEmail {
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
  autoRechargeEnabled: boolean;
  autoRechargeFailed: boolean;

  constructor({
    user,
    team,
    autoRechargeEnabled = false,
    autoRechargeFailed = false,
  }: {
    user: { id: number; name: string | null; email: string; t: TFunction };
    team?: { id: number; name: string | null };
    autoRechargeEnabled?: boolean;
    autoRechargeFailed?: boolean;
  }) {
    super();
    this.user = { ...user, name: user.name || "" };
    this.team = team ? { ...team, name: team.name || "" } : undefined;
    this.autoRechargeEnabled = autoRechargeEnabled;
    this.autoRechargeFailed = autoRechargeFailed;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const subject = this.autoRechargeFailed
      ? this.user.t("auto_recharge_failed")
      : this.team
      ? this.user.t("action_required_out_of_credits", { teamName: this.team.name })
      : this.user.t("action_required_user_out_of_credits");

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject,
      html: await renderEmail("CreditBalanceLimitReachedEmail", {
        team: this.team,
        user: this.user,
        autoRechargeEnabled: this.autoRechargeEnabled,
        autoRechargeFailed: this.autoRechargeFailed,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    if (this.autoRechargeFailed) {
      return "Your auto-recharge payment failed. Your team is out of credits. Please update your payment method and purchase more credits.";
    } else if (this.autoRechargeEnabled) {
      return "Your team ran out of credits, but auto-recharge is enabled. A recharge will be attempted soon.";
    }
    return "Your team ran out of credits. Please buy more credits.";
  }
}
