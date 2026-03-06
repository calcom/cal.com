import { WEBAPP_URL } from "@calcom/lib/constants";
import type { TFunction } from "i18next";

import { CossBaseEmailHtml, CossCallToAction } from "../components";

export interface DunningSoftBlockEmailProps {
  user: {
    name: string;
    email: string;
    t: TFunction;
  };
  team: {
    id: number;
    name: string;
  };
  invoiceUrl?: string | null;
}

export const DunningSoftBlockEmail = (props: DunningSoftBlockEmailProps) => {
  const { user, team, invoiceUrl } = props;
  const { t } = user;

  return (
    <CossBaseEmailHtml subject={t("dunning_soft_block_email_subject")}>
      <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 600, lineHeight: "1.3" }}>
        {t("dunning_soft_block_email_subject")}
      </h1>

      <p style={{ margin: "0 0 16px" }}>
        {t("hi_user_name", { name: user.name, interpolation: { escapeValue: false } })},
      </p>

      <p style={{ margin: "0 0 16px" }}>{t("dunning_soft_block_email_body")}</p>

      <p style={{ margin: "0 0 32px" }}>
        {t("dunning_soft_block_email_body_3")}
      </p>

      <div style={{ marginBottom: "32px" }}>
        <CossCallToAction
          label={t("update_billing_details")}
          href={invoiceUrl || `${WEBAPP_URL}/settings/teams/${team.id}/billing`}
        />
      </div>

      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#a1a1aa" }}>
        {t("dunning_soft_block_email_footer")}
      </p>
      <p style={{ margin: "0", fontSize: "13px", color: "#a1a1aa" }}>
        {t("dunning_soft_block_email_footer_2")}
      </p>
    </CossBaseEmailHtml>
  );
};
