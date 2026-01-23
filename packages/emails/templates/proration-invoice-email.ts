import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import type { ProrationInvoiceEmailProps } from "../src/templates/ProrationInvoiceEmail";
import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export default class ProrationInvoiceEmail extends BaseEmail {
  private emailData: ProrationInvoiceEmailProps;

  constructor(emailData: ProrationInvoiceEmailProps) {
    super();
    this.name = emailData.isReminder ? "SEND_PRORATION_INVOICE_REMINDER_EMAIL" : "SEND_PRORATION_INVOICE_EMAIL";
    this.emailData = emailData;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const subject = this.emailData.isReminder
      ? this.emailData.language("proration_invoice_reminder_subject", { teamName: this.emailData.teamName })
      : this.emailData.language("proration_invoice_email_subject", { teamName: this.emailData.teamName });

    return {
      to: this.emailData.to,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject,
      html: await renderEmail("ProrationInvoiceEmail", this.emailData),
      text: "",
    };
  }
}

export type { ProrationInvoiceEmailProps };
