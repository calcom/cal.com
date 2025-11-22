import type { TFunction } from "next-i18next";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type GuestVerificationEmail = {
  language: TFunction;
  from: string;
  to: string;
  guestEmail: string;
  bookingTitle: string;
  bookingDate: string;
  verificationLink: string;
};

export default class GuestVerificationEmailTemplate extends BaseEmail {
  email: GuestVerificationEmail;

  constructor(email: GuestVerificationEmail) {
    super();
    this.name = "GUEST_VERIFICATION";
    this.email = email;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.email.to,
      from: this.email.from,
      subject: this.email.language("guest_verification_verify_email_to_join"),
      html: await renderEmail("GuestVerificationEmail", {
        language: this.email.language,
        guestEmail: this.email.guestEmail,
        bookingTitle: this.email.bookingTitle,
        bookingDate: this.email.bookingDate,
        verificationLink: this.email.verificationLink,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const t = this.email.language;
    return `
${t("guest_verification_youve_been_invited_as_guest")} ${this.email.bookingTitle}
${t("when")}: ${this.email.bookingDate}

${t("guest_verification_to_confirm_attendance")}
${this.email.verificationLink}

${t("guest_verification_link_expires_48h")}

${t("guest_verification_if_not_expecting_invitation")}
    `.trim();
  }
}
