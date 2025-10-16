import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export interface TeamSubscriptionPaymentFailedEmailData {
  teamName: string;
  billingPortalUrl: string;
  to: string;
  language: {
    translate: (key: string, variables?: Record<string, string | number>) => string;
  };
}

export default class TeamSubscriptionPaymentFailedEmail extends BaseEmail {
  teamData: TeamSubscriptionPaymentFailedEmailData;

  constructor(teamData: TeamSubscriptionPaymentFailedEmailData) {
    super();
    this.name = "SEND_TEAM_SUBSCRIPTION_PAYMENT_FAILED_EMAIL";
    this.teamData = teamData;
  }

  protected override getLocale(): string {
    return "";
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = this.teamData.language.translate;

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.teamData.to,
      subject: t("team_subscription_payment_failed_subject", {
        teamName: this.teamData.teamName,
      }),
      html: await renderEmail("TeamSubscriptionPaymentFailedEmail", {
        teamName: this.teamData.teamName,
        billingPortalUrl: this.teamData.billingPortalUrl,
        supportEmail: process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS || "support@cal.com",
        language: this.teamData.language,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const t = this.teamData.language.translate;
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS || "support@cal.com";

    return `
${t("team_subscription_payment_failed_title")}

${t("team_subscription_payment_failed_description", {
  teamName: this.teamData.teamName,
})}

${t("team_subscription_payment_failed_next_steps")}

${t("update_payment_method")}: ${this.teamData.billingPortalUrl}

${t("team_subscription_payment_failed_contact_support", {
  supportEmail,
})}
    `.trim();
  }
}
