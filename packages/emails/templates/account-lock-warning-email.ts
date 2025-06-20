import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class AccountLockWarningEmail extends BaseEmail {
  user: {
    id: number;
    name: string;
    email: string;
    t: TFunction;
  };
  currentCount: number;
  threshold: number;

  constructor({
    user,
    currentCount,
    threshold,
  }: {
    user: { id: number; name: string | null; email: string; t: TFunction };
    currentCount: number;
    threshold: number;
  }) {
    super();
    this.user = { ...user, name: user.name || "" };
    this.currentCount = currentCount;
    this.threshold = threshold;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.user.t("account_lock_warning_subject"),
      html: await renderEmail("AccountLockWarningEmail", {
        user: this.user,
        currentCount: this.currentCount,
        threshold: this.threshold,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const remainingAttempts = this.threshold - this.currentCount;
    return `Warning: Your account will be locked after ${remainingAttempts} more rate limit violations. Contact support@cal.com if you need assistance. Note: API v1 has a limit of 30 requests per 60 seconds, while API v2 has an increased limit of 120 requests per 60 seconds.`;
  }
}
