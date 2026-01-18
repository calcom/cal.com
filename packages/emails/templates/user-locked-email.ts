import { LockReason } from "@calcom/features/ee/api-keys/lib/autoLock";
import { APP_NAME, EMAIL_FROM_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { TFunction } from "i18next";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type UserLockedEmailData = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  lockReason: LockReason;
};

export default class UserLockedEmail extends BaseEmail {
  userLockedEvent: UserLockedEmailData;

  constructor(userLockedEvent: UserLockedEmailData) {
    super();
    this.name = "SEND_USER_LOCKED_EMAIL";
    this.userLockedEvent = userLockedEvent;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.userLockedEvent.user.name} <${this.userLockedEvent.user.email}>`,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: this.userLockedEvent.language("user_locked_email_subject", {
        appName: APP_NAME,
      }),
      html: await renderEmail("UserLockedEmail", this.userLockedEvent),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const { language, user, lockReason } = this.userLockedEvent;
    const lockReasonText = this.getLockReasonText(lockReason, language);

    return `
${language("user_locked_email_subject", { appName: APP_NAME })}

${language("hi_user_name", { name: user.name || language("user") })},

${language("user_locked_email_body")}

${language("user_locked_email_reason")}: ${lockReasonText}

${language("user_locked_email_false_alarm")}

${language("user_locked_email_contact_support")}: ${SUPPORT_MAIL_ADDRESS}

${language("user_locked_email_regards")},
${APP_NAME} ${language("team")}
`.replace(/(<([^>]+)>)/gi, "");
  }

  private getLockReasonText(lockReason: LockReason, language: TFunction): string {
    switch (lockReason) {
      case LockReason.RATE_LIMIT:
        return language("user_locked_reason_rate_limit");
      case LockReason.SPAM_WORKFLOW_BODY:
        return language("user_locked_reason_spam_workflow");
      default:
        return language("user_locked_reason_unknown");
    }
  }
}
