import type { TFunction } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { CreditUsageType } from "@calcom/prisma/enums";

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
    creditFor?: CreditUsageType;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { team, user, creditFor } = props;
  const isCalAi = creditFor === CreditUsageType.CAL_AI_PHONE_CALL;

  if (team) {
    return (
      <V2BaseEmailHtml subject={user.t("action_required_out_of_credits", { teamName: team.name })}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <> {user.t("hi_user_name", { name: user.name })},</>
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
          <>
            {isCalAi
              ? user.t("cal_ai_credit_limit_reached_message", { teamName: team.name })
              : user.t("credit_limit_reached_message", { teamName: team.name })}
          </>
        </p>
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <CallToAction
            label={user.t("buy_credits")}
            href={`${WEBAPP_URL}/settings/teams/${team.id}/billing`}
            endIconName="linkIcon"
          />
        </div>{" "}
      </V2BaseEmailHtml>
    );
  }

  return (
    <V2BaseEmailHtml subject={user.t("action_required_user_out_of_credits")}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <> {user.t("hi_user_name", { name: user.name })},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        <>
          {isCalAi
            ? user.t("cal_ai_credit_limit_reached_message_user")
            : user.t("credit_limit_reached_message_user")}
        </>
      </p>
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <CallToAction
          label={user.t("buy_credits")}
          href={`${WEBAPP_URL}/settings/billing`}
          endIconName="linkIcon"
        />
      </div>
    </V2BaseEmailHtml>
  );
};
