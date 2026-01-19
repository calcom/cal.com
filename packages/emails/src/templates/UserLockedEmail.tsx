import { LockReason } from "@calcom/features/ee/api-keys/lib/autoLock";
import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { TFunction } from "i18next";

import { BaseEmailHtml, CallToAction } from "../components";

export type UserLockedEmailProps = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  lockReason: LockReason;
};

const getLockReasonText = (lockReason: LockReason, language: TFunction): string => {
  switch (lockReason) {
    case LockReason.RATE_LIMIT:
      return language("user_locked_reason_rate_limit");
    case LockReason.SPAM_WORKFLOW_BODY:
      return language("user_locked_reason_spam_workflow");
    default:
      return language("user_locked_reason_unknown");
  }
};

export const UserLockedEmail = (
  props: UserLockedEmailProps & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { language, user, lockReason } = props;
  const lockReasonText = getLockReasonText(lockReason, language);

  return (
    <BaseEmailHtml subject={language("user_locked_email_subject", { appName: APP_NAME })}>
      <p>
        <>{language("hi_user_name", { name: user.name || language("user") })}!</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{language("user_locked_email_body")}</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <strong>{language("user_locked_email_reason")}:</strong> {lockReasonText}
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{language("user_locked_email_false_alarm")}</>
      </p>
      <CallToAction
        label={language("user_locked_email_contact_support_button")}
        href={`mailto:${SUPPORT_MAIL_ADDRESS}`}
      />
      <div style={{ lineHeight: "6px", marginTop: "24px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            {language("user_locked_email_regards")},
            <br />
            {APP_NAME} {language("team")}
          </>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
