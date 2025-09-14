import type { TFunction } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";
import type { BaseScheduledEmail } from "./BaseScheduledEmail";

export const CreditBalanceLimitReachedEmail = (
  props: {
    team?: {
      id: number;
      name: string;
    };
    user: {
      id: number;
      name: string;
      email: string;
      t: TFunction;
    };
    autoRechargeEnabled?: boolean;
    autoRechargeFailed?: boolean;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { team, user, autoRechargeEnabled, autoRechargeFailed } = props;

  // Show different content based on auto-recharge status
  const getContent = () => {
    if (autoRechargeFailed) {
      return (
        <>
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            {user.t("hi_user_name", { name: user.name })},
          </p>
          <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
            {team
              ? user.t("auto_recharge_payment_failed", { teamName: team.name })
              : user.t("auto_recharge_payment_failed_user")}
          </p>
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <CallToAction
              label={user.t("update_payment_method")}
              href={
                team ? `${WEBAPP_URL}/settings/teams/${team.id}/billing` : `${WEBAPP_URL}/settings/billing`
              }
              endIconName="linkIcon"
            />
          </div>
        </>
      );
    }

    if (autoRechargeEnabled) {
      return (
        <>
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            {user.t("hi_user_name", { name: user.name })},
          </p>
          <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
            {team
              ? user.t("credit_limit_reached_auto_recharge", { teamName: team.name })
              : user.t("credit_limit_reached_auto_recharge_user")}
          </p>
        </>
      );
    }

    // Default content (no auto-recharge)
    if (team) {
      return (
        <>
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            {user.t("hi_user_name", { name: user.name })},
          </p>
          <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
            {user.t("credit_limit_reached_message", { teamName: team.name })}
          </p>
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <CallToAction
              label={user.t("buy_credits")}
              href={`${WEBAPP_URL}/settings/teams/${team.id}/billing`}
              endIconName="linkIcon"
            />
          </div>
        </>
      );
    }

    return (
      <>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>{user.t("hi_user_name", { name: user.name })},</p>
        <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
          {user.t("credit_limit_reached_message_user")}
        </p>
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <CallToAction
            label={user.t("buy_credits")}
            href={`${WEBAPP_URL}/settings/billing`}
            endIconName="linkIcon"
          />
        </div>
      </>
    );
  };

  // Determine email subject based on status
  const getSubject = () => {
    if (autoRechargeFailed) {
      return user.t("auto_recharge_failed");
    }

    if (team) {
      return user.t("action_required_out_of_credits", { teamName: team.name });
    }

    return user.t("action_required_user_out_of_credits");
  };

  return <V2BaseEmailHtml subject={getSubject()}>{getContent()}</V2BaseEmailHtml>;
};
