import type { TFunction } from "next-i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";
import type { BaseScheduledEmail } from "./BaseScheduledEmail";

export const CreditBalanceLowWarningEmail = (
  props: {
    user: { name: string; email: string; t: TFunction };
    teamName?: string;
    balance: number;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { user, teamName, balance } = props;

  const body = teamName
    ? `Your team ${teamName} is running low on credits.`
    : `You are running low on credits.`;

  return (
    <V2BaseEmailHtml subject="Credit balance low">
      <div>{teamName ? `Hi ${user.name},` : `Hi,`}</div>
      <div style={{ width: "89px", marginBottom: "35px" }}>{body}</div>
      <div>Current balance: {balance}</div>
      <div>
        <CallToAction label="Buy Credits" href={WEBAPP_URL} endIconName="linkIcon" />
      </div>
    </V2BaseEmailHtml>
  );
};
