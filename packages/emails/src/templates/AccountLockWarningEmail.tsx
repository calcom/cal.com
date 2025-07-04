import type { TFunction } from "next-i18next";

import { CallToAction, V2BaseEmailHtml } from "../components";

export const AccountLockWarningEmail = (props: {
  user: {
    id: number;
    name: string;
    email: string;
    t: TFunction;
  };
  currentCount: number;
  threshold: number;
}) => {
  const { user, currentCount, threshold } = props;
  const remainingAttempts = threshold - currentCount;
  const supportMailto = `mailto:support@cal.com?subject=Account Lock Warning&body=Hello,%0A%0AI received a warning about my account being locked due to rate limit violations. Please help me resolve this issue.%0A%0ANote: API v1 has a limit of 30 requests per 60 seconds, while API v2 has an increased limit of 120 requests per 60 seconds. If you are using API v1, consider upgrading to API v2 for higher rate limits.%0A%0AThank you`;

  return (
    <V2BaseEmailHtml subject={user.t("account_lock_warning_subject")}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>{user.t("hi_user_name", { name: user.name })},</p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        {user.t("account_lock_warning_message", { remainingAttempts })}
      </p>
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <CallToAction label={user.t("contact_support")} href={supportMailto} />
      </div>
    </V2BaseEmailHtml>
  );
};
