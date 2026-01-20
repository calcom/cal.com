import type { TFunction } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";

export interface ProrationPaymentReminderEmailProps {
  team: {
    id: number;
    name: string;
  };
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  proration: {
    seatsAdded: number;
    monthKey: string;
    proratedAmount: number;
  };
}

export const ProrationPaymentReminderEmail = (props: ProrationPaymentReminderEmailProps) => {
  const { team, user, proration } = props;
  const formattedAmount = (proration.proratedAmount / 100).toFixed(2);

  return (
    <V2BaseEmailHtml subject={user.t("proration_payment_reminder_subject", { teamName: team.name })}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        {user.t("hi_user_name", { name: user.name })},
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        {user.t("proration_payment_reminder_intro", { teamName: team.name })}
      </p>

      <div
        style={{
          backgroundColor: "#FEF3C7",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid #F59E0B",
        }}>
        <p
          style={{
            fontWeight: 600,
            lineHeight: "24px",
            color: "#92400E",
            marginBottom: "12px",
          }}>
          {user.t("proration_payment_overdue")}
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px", color: "#78350F", margin: "8px 0" }}>
          {user.t("proration_seats_added", { count: proration.seatsAdded, monthKey: proration.monthKey })}
        </p>
        <p
          style={{
            fontWeight: 600,
            lineHeight: "24px",
            color: "#92400E",
            marginTop: "16px",
          }}>
          {user.t("proration_amount_due", { amount: formattedAmount })}
        </p>
      </div>

      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        {user.t("proration_payment_reminder_action")}
      </p>

      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <CallToAction
          label={user.t("pay_now")}
          href={`${WEBAPP_URL}/settings/teams/${team.id}/billing`}
          endIconName="linkIcon"
        />
      </div>
    </V2BaseEmailHtml>
  );
};
