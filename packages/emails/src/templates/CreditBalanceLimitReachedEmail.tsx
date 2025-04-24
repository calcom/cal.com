import type { TFunction } from "next-i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";
import type { BaseScheduledEmail } from "./BaseScheduledEmail";

export const CreditBalanceLimitReachedEmail = (
  props: {
    team: {
      id: number;
      name: string;
    };
    user: {
      name: string;
      email: string;
      t: TFunction;
    };
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { team, user } = props;

  return (
    <V2BaseEmailHtml subject={user.t("action_required_out_of_credits", { teamName: team.name })}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <> {user.t("hi_user_name", { name: user.name })},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        <>{user.t("credit_limit_reached_message", { teamName: team.name })}</>
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
};
