import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export interface ProrationPaymentReminderEmailInput {
  team: {
    id: number;
    name: string | null;
  };
  user: {
    name: string | null;
    email: string;
    t: TFunction;
  };
  proration: {
    seatsAdded: number;
    monthKey: string;
    proratedAmount: number;
  };
}

export default class ProrationPaymentReminderEmail extends BaseEmail {
  team: {
    id: number;
    name: string;
  };
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  proration: {
    seatsAdded: number;
    monthKey: string;
    proratedAmount: number;
  };

  constructor(input: ProrationPaymentReminderEmailInput) {
    super();
    this.team = { ...input.team, name: input.team.name || "" };
    this.user = { ...input.user, name: input.user.name || "" };
    this.proration = input.proration;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.user.t("proration_payment_reminder_subject", { teamName: this.team.name }),
      html: await renderEmail("ProrationPaymentReminderEmail", {
        team: this.team,
        user: this.user,
        proration: this.proration,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const formattedAmount = (this.proration.proratedAmount / 100).toFixed(2);
    return `Payment reminder for ${this.team.name}: Your invoice for ${this.proration.seatsAdded} additional seat(s) for ${this.proration.monthKey} is still unpaid. Amount due: $${formattedAmount}. Please pay now to avoid service interruption.`;
  }
}
