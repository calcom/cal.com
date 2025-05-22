import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { WEBAPP_URL } from "@calcom/lib/constants";

import BaseEmail from "./_base-email";

export default class DelegationCredentialDisabledEmail extends BaseEmail {
  recipientEmail: string;
  recipientName?: string;
  calendarAppName: string;
  conferencingAppName: string;

  constructor({
    recipientEmail,
    recipientName,
    calendarAppName,
    conferencingAppName,
  }: {
    recipientEmail: string;
    recipientName?: string;
    calendarAppName: string;
    conferencingAppName: string;
  }) {
    super();
    this.name = "DELEGATION_CREDENTIAL_DISABLED";
    this.recipientEmail = recipientEmail;
    this.recipientName = recipientName;
    this.calendarAppName = calendarAppName;
    this.conferencingAppName = conferencingAppName;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.recipientEmail,
      subject: `You might need to connect your ${this.calendarAppName}`,
      html: await this.getHtml(),
      text: this.getTextBody(),
    };
  }

  async getHtml() {
    return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Action Required: Connect your ${this.calendarAppName}</h2>
        <p>
          ${this.recipientName ? `Hi ${this.recipientName},` : "Hello,"}
        </p>
        <p>
          An admin has disabled Delegation Credential for your organization. You may need to connect your <b>${
            this.calendarAppName
          }</b> to use Cal.com effectively. Connecting your calendar is crucial as it allows us to check for conflicts to prevent double bookings and automatically add new events to your schedule.
        </p>
        <p>
          Please log in to your Cal.com account and connect your calendar from your settings page by visiting: <a href="${WEBAPP_URL}/settings/my-account/calendars">${WEBAPP_URL}/settings/my-account/calendars</a>.
        </p>
        <p>
          Additionally, please ensure you have the ${
            this.conferencingAppName
          } app installed. You can manage your conferencing apps here: <a href="${WEBAPP_URL}/settings/my-account/conferencing">${WEBAPP_URL}/settings/my-account/conferencing</a>.
        </p>
        <p>
          If you have already connected your calendar and installed ${
            this.conferencingAppName
          }, you can ignore this message.
        </p>
        <p>
          Thank you,<br />The Cal.com Team
        </p>
      </div>
    `;
  }

  protected getTextBody(): string {
    return `Action Required: Connect your ${this.calendarAppName}\n\nAn admin has disabled Delegation Credential for your organization. You may need to connect your ${this.calendarAppName} manually to continue receiving bookings and updates, and to allow Cal.com to check for conflicts to prevent double bookings and automatically add new events to your schedule.\n\nPlease log in to your Cal.com account and connect your calendar from your settings page by visiting: ${WEBAPP_URL}/settings/my-account/calendars.\n\nAdditionally, please ensure you have the ${this.conferencingAppName} app installed. You can manage your conferencing apps here: ${WEBAPP_URL}/settings/my-account/conferencing.\n\nIf you have already connected your calendar and installed ${this.conferencingAppName}, you can ignore this message.\n\nThank you,\nThe Cal.com Team`;
  }
}
