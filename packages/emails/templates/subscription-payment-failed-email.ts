import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export interface SubscriptionPaymentFailedEmailData {
  entityName: string;
  billingPortalUrl: string;
  to: string;
  language: {
    translate: (key: string, variables?: Record<string, string | number>) => string;
  };
}

export default class SubscriptionPaymentFailedEmail extends BaseEmail {
  emailData: SubscriptionPaymentFailedEmailData;

  constructor(emailData: SubscriptionPaymentFailedEmailData) {
    super();
    this.name = "SEND_SUBSCRIPTION_PAYMENT_FAILED_EMAIL";
    this.emailData = emailData;
  }

  protected override getLocale(): string {
    return "";
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = this.emailData.language.translate;

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.emailData.to,
      subject: t("subscription_payment_failed_subject", {
        entityName: this.emailData.entityName,
      }),
      html: await renderEmail("SubscriptionPaymentFailedEmail", {
        entityName: this.emailData.entityName,
        billingPortalUrl: this.emailData.billingPortalUrl,
        supportEmail: process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS || "support@cal.com",
        language: this.emailData.language,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const t = this.emailData.language.translate;
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS || "support@cal.com";

    return `
${t("subscription_payment_failed_title")}

${t("subscription_payment_failed_description", {
  entityName: this.emailData.entityName,
})}

${t("subscription_payment_failed_next_steps")}

${t("update_payment_method")}: ${this.emailData.billingPortalUrl}

${t("subscription_payment_failed_contact_support", {
  supportEmail,
})}
    `.trim();
  }
}
