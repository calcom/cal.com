import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getSettingsLayout as getLayout, Meta } from "@calcom/ui";

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
