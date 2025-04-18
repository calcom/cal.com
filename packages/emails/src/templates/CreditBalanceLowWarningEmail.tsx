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
      <p
        style={{
          fontSize: "16px",
          fontWeight: "400",
          lineHeight: "18px",
          color: "#000",
          textAlign: "center",
        }}>
        Your cal.com team {teamName} is running low on credits.
      </p>
      <p
        style={{
          fontSize: "18px",
          fontWeight: "500",
          lineHeight: "26px",
          color: "#000",
          textAlign: "center",
        }}>
        Current balance: {balance} credits
      </p>
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <CallToAction label="Buy Credits" href={WEBAPP_URL} endIconName="linkIcon" /> {/* add team id */}
      </div>{" "}
    </V2BaseEmailHtml>
  );
};
