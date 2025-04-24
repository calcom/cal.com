import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class CreditBalanceLimitReachedEmail extends BaseEmail {
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  team: {
    id: number;
    name: string;
  };

  constructor(user: { name: string; email: string; t: TFunction }, team: { id: number; name: string }) {
    super();
    this.user = user;
    this.team = team;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.user.t("action_required_out_of_credits", { teamName: this.team.name }),
      html: await renderEmail("CreditBalanceLimitReachedEmail", {
        team: this.team,
        user: this.user,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return "You are running low on credits. Please buy more credits.";
  }
}
