import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";
import { Button } from "@calcom/ui/v2/core";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const BillingView = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta title="Team Billing" description="Manage billing for your team" />

      <div className="flex flex-col text-sm sm:flex-row">
        <div>
          <h2 className="font-medium">{t("billing_manage_details_title")}</h2>
          <p>{t("billing_manage_details_description")}</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pt-0 sm:pl-3">
          <Button
            color="primary"
            href="/api/integrations/stripepayment/portal"
            target="_blank"
            EndIcon={Icon.FiExternalLink}>
            {t("billing_portal")}
          </Button>
        </div>
      </div>
    </>
  );
};

BillingView.getLayout = getLayout;

export default BillingView;
