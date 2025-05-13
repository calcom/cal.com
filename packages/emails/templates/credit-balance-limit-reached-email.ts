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

  constructor({
    user,
    team,
  }: {
    user: { id: number; name: string | null; email: string; t: TFunction };
    team?: { id: number; name: string | null };
  }) {
    super();
    this.user = { ...user, name: user.name || "" };
    this.team = team ? { ...team, name: team.name || "" } : undefined;
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
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return "Your team ran out of credits. Please buy more credits.";
  }
}
