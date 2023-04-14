import { useRouter } from "next/router";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta } from "@calcom/ui";
import { ExternalLink } from "@calcom/ui/components/icon";

import { getLayout } from "../../../settings/layouts/SettingsLayout";

const BillingView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const returnTo = router.asPath;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;
  return (
    <>
      <Meta title={t("team_billing")} description={t("team_billing_description")} />
      <div className="text-default flex flex-col text-sm sm:flex-row">
        <div>
          <h2 className="font-medium">{t("billing_manage_details_title")}</h2>
          <p>{t("billing_manage_details_description")}</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pt-0 sm:pl-3">
          <Button color="primary" href={billingHref} target="_blank" EndIcon={ExternalLink}>
            {t("billing_portal")}
          </Button>
        </div>
      </div>
    </>
  );
};

BillingView.getLayout = getLayout;

export default BillingView;
