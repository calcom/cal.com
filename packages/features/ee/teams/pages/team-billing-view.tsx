import { usePathname } from "next/navigation";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta } from "@calcom/ui";
import { ExternalLink } from "@calcom/ui/components/icon";

import { getLayout } from "../../../settings/layouts/SettingsLayout";

const BillingView = () => {
  const pathname = usePathname();
  const { t } = useLocale();
  const returnTo = pathname;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;
  return (
    <>
      <Meta title={t("billing")} description={t("team_billing_description")} borderInShellHeader={true} />
      <div className="text-default flex flex-col text-sm sm:flex-row">
        <div>
          <h2 className="font-medium">{t("view_and_manage_billing_details")}</h2>
          <p>{t("view_and_edit_billing_details")}</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">
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
