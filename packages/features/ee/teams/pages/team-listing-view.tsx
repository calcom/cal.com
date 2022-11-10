import { useLocale } from "@calcom/lib/hooks/useLocale";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

import { TeamsListing } from "../components";

const BillingView = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("teams")} description={t("create_manage_teams_collaborative")} />
      <TeamsListing />
    </>
  );
};

BillingView.getLayout = getLayout;

export default BillingView;
