import { createHash } from "crypto";
import { totp } from "otplib";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";

import type { PendingGuestConfirmation } from "../lib/types/email-types";
import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type { PendingGuestConfirmation } from "../lib/types/email-types";

export default class PendingGuestConfirmationEmail extends BaseEmail {
  confirmationInput: PendingGuestConfirmation;

  constructor(input: PendingGuestConfirmation) {
    super();
    this.name = "PENDING_GUEST_CONFIRMATION";
    this.confirmationInput = input;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const secret = createHash("md5")
      .update(this.confirmationInput.guest.email + process.env.CALENDSO_ENCRYPTION_KEY)
      .digest("hex");

    totp.options = { step: 900 };
    const code = totp.generate(secret);

    const confirmationUrl = `${WEBAPP_URL}/api/bookings/confirm-guest?email=${encodeURIComponent(
      this.confirmationInput.guest.email
    )}&bookingUid=${this.confirmationInput.booking.uid}&code=${code}`;

    return {
      to: `${this.confirmationInput.guest.name || ""} <${this.confirmationInput.guest.email}>`,
      from: `${this.confirmationInput.organizer.name} <${this.getMailerOptions().from}>`,
      subject: this.confirmationInput.language("confirm_guest_attendance", {
        eventName: this.confirmationInput.booking.title,
        appName: APP_NAME,
      }),
      html: await renderEmail("PendingGuestConfirmation", {
        ...this.confirmationInput,
        confirmationUrl,
        code,
      }),
      text: this.getTextBody(confirmationUrl, code),
    };
  }

  protected getTextBody(confirmationUrl: string, code: string): string {
    return `
${this.confirmationInput.language("hi_user_name", {
  name: this.confirmationInput.guest.name || "Guest",
})}

${this.confirmationInput.language("pending_guest_confirmation_body", {
  organizerName: this.confirmationInput.organizer.name,
  eventName: this.confirmationInput.booking.title,
})}

${this.confirmationInput.language("confirmation_code")}: ${code}

${this.confirmationInput.language("or_click_link")}: ${confirmationUrl}

${this.confirmationInput.language("code_expires_in", { minutes: 15 })}
`.trim();
  }
}
