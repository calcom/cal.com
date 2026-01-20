import type { TFunction } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { CallToAction, V2BaseEmailHtml } from "../components";

export interface ProrationInvoiceEmailProps {
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
    remainingDays: number;
    proratedAmount: number;
  };
}

export const ProrationInvoiceEmail = (props: ProrationInvoiceEmailProps) => {
  const { team, user, proration } = props;
  const formattedAmount = (proration.proratedAmount / 100).toFixed(2);

  return (
    <V2BaseEmailHtml subject={user.t("proration_invoice_subject", { teamName: team.name })}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        {user.t("hi_user_name", { name: user.name })},
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        {user.t("proration_invoice_intro", { teamName: team.name })}
      </p>

      <div
        style={{
          backgroundColor: "#F9FAFB",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}>
        <p
          style={{
            fontWeight: 600,
            lineHeight: "24px",
            color: "#111827",
            marginBottom: "12px",
          }}>
          {user.t("proration_invoice_details")}
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px", color: "#374151", margin: "8px 0" }}>
          {user.t("proration_seats_added", { count: proration.seatsAdded, monthKey: proration.monthKey })}
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px", color: "#374151", margin: "8px 0" }}>
          {user.t("proration_remaining_days", { count: proration.remainingDays })}
        </p>
        <p
          style={{
            fontWeight: 600,
            lineHeight: "24px",
            color: "#111827",
            marginTop: "16px",
            borderTop: "1px solid #E5E7EB",
            paddingTop: "12px",
          }}>
          {user.t("proration_total_amount", { amount: formattedAmount })}
        </p>
      </div>

      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "20px" }}>
        {user.t("proration_invoice_payment_info")}
      </p>

      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <CallToAction
          label={user.t("view_billing")}
          href={`${WEBAPP_URL}/settings/teams/${team.id}/billing`}
          endIconName="linkIcon"
        />
      </div>
    </V2BaseEmailHtml>
  );
};
