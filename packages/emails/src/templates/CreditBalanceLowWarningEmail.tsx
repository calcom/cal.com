import type { TFunction } from "next-i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";
import type { BaseScheduledEmail } from "./BaseScheduledEmail";

export const CreditBalanceLowWarningEmail = (
  props: {
    teamName: string;
    balance: number;
    user: {
      name: string;
      email: string;
      t: TFunction;
    };
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { teamName, balance, user } = props;

  return (
    <V2BaseEmailHtml subject="Credit balance low">
      <div>Hi {user.name},</div>
      <div style={{ width: "89px", marginBottom: "35px" }}>
        Your team ${teamName} is running low on credits.
      </div>
      <div>Current balance: {balance}</div>
      <div>
        <CallToAction label="Buy Credits" href={WEBAPP_URL} endIconName="linkIcon" />
      </div>
      <div>This email was sent to all team admins.</div>
    </V2BaseEmailHtml>
  );
};
