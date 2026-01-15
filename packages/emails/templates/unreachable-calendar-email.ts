import { EMAIL_FROM_NAME, WEBAPP_URL } from "@calcom/lib/constants";

import BaseEmail from "./_base-email";

export class UnreachableCalendarEmail extends BaseEmail {
  recipientEmail: string;
  recipientName?: string;
  calendarName: string;
  reason: string;

  private esc(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  constructor({
    recipientEmail,
    recipientName,
    calendarName,
    reason,
  }: {
    recipientEmail: string;
    recipientName?: string;
    calendarName: string;
    reason: string;
  }) {
    super();
    this.name = "UNREACHABLE_CALENDAR";
    this.recipientEmail = recipientEmail;
    this.recipientName = recipientName;
    this.calendarName = calendarName;
    this.reason = reason;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.recipientEmail,
      subject: `Action needed: Your ${this.calendarName} is unreachable`,
      html: await this.getHtml(),
      text: this.getTextBody(),
    };
  }

  async getHtml() {
    const escapedCalendarName = this.esc(this.calendarName);
    const escapedRecipientName = this.recipientName ? this.esc(this.recipientName) : undefined;
    const escapedReason = this.reason ? this.esc(this.reason) : undefined;

    return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Action Required: Your ${escapedCalendarName} is unreachable</h2>
        <p>
          ${escapedRecipientName ? `Hi ${escapedRecipientName},` : "Hello,"}
        </p>
        <p>
          Your linked calendar <strong>${escapedCalendarName}</strong> is no longer reachable. 
          ${escapedReason ? `Reason: ${escapedReason}.` : ""} 
          Until you reconnect or remove it, invitees will see no availability on your booking pages.
        </p>
        <p>
          <strong>What this means:</strong>
        </p>
        <ul>
          <li>Your booking links will show no available time slots</li>
          <li>Potential meetings may be missed</li>
          <li>Cal.com cannot check for conflicts or add new events to your calendar</li>
        </ul>
        <p>
          <strong>How to fix this:</strong>
        </p>
        <p>
          Please log in to your Cal.com account and reconnect your calendar from your settings page:
          <br />
          <a href="${WEBAPP_URL}/settings/my-account/calendars" style="color: #3b82f6; text-decoration: none;">
            ${WEBAPP_URL}/settings/my-account/calendars
          </a>
        </p>
        <p>
          If you no longer use this calendar, you can safely remove it from your Cal.com settings.
        </p>
        <p>
          If you have already reconnected your calendar, you can ignore this message.
        </p>
        <p>
          Thank you,<br />
          The Cal.com Team
        </p>
      </div>
    `;
  }

  protected getTextBody(): string {
    return `Action Required: Your ${this.calendarName} is unreachable

${this.recipientName ? `Hi ${this.recipientName},` : "Hello,"}

Your linked calendar ${this.calendarName} is no longer reachable. ${
      this.reason ? `Reason: ${this.reason}.` : ""
    } Until you reconnect or remove it, invitees will see no availability on your booking pages.

What this means:
- Your booking links will show no available time slots
- Potential meetings may be missed
- Cal.com cannot check for conflicts or add new events to your calendar

How to fix this:
Please log in to your Cal.com account and reconnect your calendar from your settings page: ${WEBAPP_URL}/settings/my-account/calendars

If you no longer use this calendar, you can safely remove it from your Cal.com settings.

If you have already reconnected your calendar, you can ignore this message.

Thank you,
The Cal.com Team`;
  }
}
