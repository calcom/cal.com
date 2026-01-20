import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export interface ProrationInvoiceEmailInput {
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
    remainingDays: number;
    proratedAmount: number;
  };
}

export default class ProrationInvoiceEmail extends BaseEmail {
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
    remainingDays: number;
    proratedAmount: number;
  };

  constructor(input: ProrationInvoiceEmailInput) {
    super();
    this.team = { ...input.team, name: input.team.name || "" };
    this.user = { ...input.user, name: input.user.name || "" };
    this.proration = input.proration;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.user.t("proration_invoice_subject", { teamName: this.team.name }),
      html: await renderEmail("ProrationInvoiceEmail", {
        team: this.team,
        user: this.user,
        proration: this.proration,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const formattedAmount = (this.proration.proratedAmount / 100).toFixed(2);
    return `Invoice for ${this.team.name}: Additional ${this.proration.seatsAdded} seat(s) for ${this.proration.monthKey} (${this.proration.remainingDays} days remaining). Total: $${formattedAmount}`;
  }
}
