import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import type { TFunction } from "i18next";
import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export interface ProrationInvoiceEmailParams {
  user: {
    name: string | null;
    email: string;
    t: TFunction;
  };
  team: {
    id: number;
    name: string | null;
  };
  proration: {
    monthKey: string;
    netSeatIncrease: number;
    proratedAmount: number;
  };
  invoiceUrl?: string | null;
  isAutoCharge: boolean;
}

export default class ProrationInvoiceEmail extends BaseEmail {
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  team: {
    id: number;
    name: string;
  };
  proration: {
    monthKey: string;
    netSeatIncrease: number;
    proratedAmount: number;
  };
  invoiceUrl?: string | null;
  isAutoCharge: boolean;

  constructor(params: ProrationInvoiceEmailParams) {
    super();
    this.user = { ...params.user, name: params.user.name || "" };
    this.team = { ...params.team, name: params.team.name || "" };
    this.proration = params.proration;
    this.invoiceUrl = params.invoiceUrl;
    this.isAutoCharge = params.isAutoCharge;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const formattedAmount = (this.proration.proratedAmount / 100).toFixed(2);

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.user.t("proration_invoice_subject", {
        teamName: this.team.name,
        amount: formattedAmount,
      }),
      html: await renderEmail("ProrationInvoiceEmail", {
        user: this.user,
        team: this.team,
        proration: this.proration,
        invoiceUrl: this.invoiceUrl,
        isAutoCharge: this.isAutoCharge,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const formattedAmount = (this.proration.proratedAmount / 100).toFixed(2);
    return this.user.t("proration_invoice_text", {
      amount: formattedAmount,
      seats: this.proration.netSeatIncrease,
      teamName: this.team.name,
    });
  }
}
