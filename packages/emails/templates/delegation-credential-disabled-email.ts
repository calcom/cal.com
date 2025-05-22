import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import BaseEmail from "./_base-email";

export default class DelegationCredentialDisabledEmail extends BaseEmail {
  recipientEmail: string;
  recipientName?: string;
  connectionName: string;

  constructor({
    recipientEmail,
    recipientName,
    connectionName,
  }: {
    recipientEmail: string;
    recipientName?: string;
    connectionName: string;
  }) {
    super();
    this.name = "DELEGATION_CREDENTIAL_DISABLED";
    this.recipientEmail = recipientEmail;
    this.recipientName = recipientName;
    this.connectionName = connectionName;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.recipientEmail,
      subject: `You might need to connect your ${this.connectionName} Calendar`,
      html: await this.getHtml(),
      text: this.getTextBody(),
    };
  }

  async getHtml() {
    return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Action Required: Connect your ${this.connectionName} Calendar</h2>
        <p>
          ${this.recipientName ? `Hi ${this.recipientName},` : "Hello,"}
        </p>
        <p>
          An admin has disabled Delegation Credential for your organization. You may need to connect your <b>${
            this.connectionName
          } Calendar</b> manually to continue receiving bookings and updates.
        </p>
        <p>
          Please log in to your Cal.com account and connect your calendar from your settings page.
        </p>
        <p>
          If you have already connected your calendar, you can ignore this message.
        </p>
        <p>
          Thank you,<br />The Cal.com Team
        </p>
      </div>
    `;
  }

  protected getTextBody(): string {
    return `Action Required: Connect your ${this.connectionName} Calendar\n\nAn admin has disabled Delegation Credential for your organization. You may need to connect your ${this.connectionName} Calendar manually to continue receiving bookings and updates.\n\nPlease log in to your Cal.com account and connect your calendar from your settings page.\n\nIf you have already connected your calendar, you can ignore this message.\n\nThank you,\nThe Cal.com Team`;
  }
}
