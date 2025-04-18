import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";
import type { BaseScheduledEmail } from "./BaseScheduledEmail";

export const CreditBalanceLowWarningEmail = (
  props: {
    teamName: string;
    balance: number;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { teamName, balance } = props;

  return (
    <V2BaseEmailHtml subject="Credit balance low">
      <div>Hi,</div>
      <div style={{ width: "89px", marginBottom: "35px" }}>
        Your team ${teamName} is running low on credits.
      </div>
      <div>Current balance: {balance}</div>
      <div>
        <CallToAction label="Buy Credits" href={WEBAPP_URL} endIconName="linkIcon" />
      </div>
    </V2BaseEmailHtml>
  );
};
