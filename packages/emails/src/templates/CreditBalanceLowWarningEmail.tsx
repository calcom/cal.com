import type { TFunction } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";
import type { BaseScheduledEmail } from "./BaseScheduledEmail";

export const CreditBalanceLowWarningEmail = (
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
    balance: number;
    autoRechargeEnabled?: boolean;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { team, user, balance, autoRechargeEnabled } = props;

  const getContent = () => {
    if (autoRechargeEnabled) {
      return (
        <>
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            {user.t("hi_user_name", { name: user.name })},
          </p>
          <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
            {team
              ? user.t("team_credits_low_auto_recharge", { teamName: team.name, balance })
              : user.t("user_credits_low_auto_recharge", { balance })}
          </p>
        </>
      );
    }

    if (team) {
      return (
        <>
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            {user.t("hi_user_name", { name: user.name })},
          </p>
          <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
            {user.t("team_credits_low_warning_message", { teamName: team.name, balance })}
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
          {user.t("user_credits_low_warning_message", { balance })}
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

  return (
    <V2BaseEmailHtml
      subject={
        team
          ? user.t("team_credits_low_warning", { teamName: team.name })
          : user.t("user_credits_low_warning")
      }>
      {getContent()}
    </V2BaseEmailHtml>
  );
};
