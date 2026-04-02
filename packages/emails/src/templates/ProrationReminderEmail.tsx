import { WEBAPP_URL } from "@calcom/lib/constants";
import type { TFunction } from "i18next";
import { CallToAction, V2BaseEmailHtml } from "../components";

export interface ProrationReminderEmailProps {
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  team: {
    id: number;
    name: string;
  };
  proration: {
    monthKey: string;
    netSeatIncrease: number;
    proratedAmount: number;
  };
  invoiceUrl?: string | null;
}

export const ProrationReminderEmail = (props: ProrationReminderEmailProps) => {
  const { user, team, proration, invoiceUrl } = props;
  const { t } = user;
  const formattedAmount = (proration.proratedAmount / 100).toFixed(2);

  return (
    <V2BaseEmailHtml
      subject={t("proration_reminder_subject", {
        teamName: team.name,
        interpolation: { escapeValue: false },
      })}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        {t("hi_user_name", { name: user.name, interpolation: { escapeValue: false } })},
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "24px" }}>
        {t("proration_reminder_message", {
          teamName: team.name,
          amount: formattedAmount,
          interpolation: { escapeValue: false },
        })}
      </p>

      {/* Warning Banner */}
      <p
        style={{
          backgroundColor: "#FEF3C7",
          borderLeft: "4px solid #F59E0B",
          padding: "12px 16px",
          marginBottom: "24px",
          color: "#92400E",
          fontWeight: 500,
          lineHeight: "20px",
        }}>
        {t("proration_reminder_warning")}
      </p>

      {/* Invoice Details Table */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
            padding: "12px 0",
          }}>
          <span style={{ fontWeight: 500, color: "#374151" }}>{t("proration_description")}</span>
          <span style={{ fontWeight: 500, color: "#374151" }}>{t("amount")}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
            padding: "12px 0",
          }}>
          <span style={{ color: "#6B7280" }}>
            {t("proration_line_item", {
              seats: proration.netSeatIncrease,
              month: proration.monthKey,
            })}
          </span>
          <span style={{ color: "#6B7280" }}>${formattedAmount}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
          }}>
          <span style={{ fontWeight: 600, color: "#111827" }}>{t("total")}</span>
          <span style={{ fontWeight: 600, color: "#111827" }}>${formattedAmount}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <a
          href={`${WEBAPP_URL}/settings/teams/${team.id}/billing`}
          style={{ color: "#6B7280", fontSize: "14px", textDecoration: "none" }}>
          {t("view_billing_settings")}
        </a>
        {invoiceUrl && <CallToAction label={t("pay_invoice_now")} href={invoiceUrl} />}
      </div>
    </V2BaseEmailHtml>
  );
};
