import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import type { CreditUsageType } from "@calcom/prisma/enums";

import renderEmail from "../src/renderEmail";
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
  creditFor?: CreditUsageType;

  constructor({
    user,
    team,
    creditFor,
  }: {
    user: { id: number; name: string | null; email: string; t: TFunction };
    team?: { id: number; name: string | null };
    creditFor?: CreditUsageType;
  }) {
    super();
    this.user = { ...user, name: user.name || "" };
    this.team = team ? { ...team, name: team.name || "" } : undefined;
    this.creditFor = creditFor;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.team
        ? this.user.t("action_required_out_of_credits", { teamName: this.team.name })
        : this.user.t("action_required_user_out_of_credits"),
      html: await renderEmail("CreditBalanceLimitReachedEmail", {
        team: this.team,
        user: this.user,
        creditFor: this.creditFor,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return "Your team ran out of credits. Please buy more credits.";
  }
}
