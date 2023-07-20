import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import { OtherTeamsListing } from "../components";

const OtherTeamListingView = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("teams")} description={t("create_manage_teams_collaborative")} />
      <OtherTeamsListing />
    </>
  );
};

OtherTeamListingView.getLayout = getLayout;

export default OtherTeamListingView;
