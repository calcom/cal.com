import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import type { TFunction } from "i18next";
import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export interface DunningWarningEmailParams {
  user: {
    name: string | null;
    email: string;
    t: TFunction;
  };
  team: {
    id: number;
    name: string | null;
  };
  invoiceUrl?: string | null;
}

export default class DunningWarningEmail extends BaseEmail {
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  team: {
    id: number;
    name: string;
  };
  invoiceUrl?: string | null;

  constructor(params: DunningWarningEmailParams) {
    super();
    this.user = { ...params.user, name: params.user.name || "" };
    this.team = { ...params.team, name: params.team.name || "" };
    this.invoiceUrl = params.invoiceUrl;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.user.t("dunning_warning_email_subject"),
      html: await renderEmail("DunningWarningEmail", {
        user: this.user,
        team: this.team,
        invoiceUrl: this.invoiceUrl,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return this.user.t("dunning_warning_email_body");
  }
}
