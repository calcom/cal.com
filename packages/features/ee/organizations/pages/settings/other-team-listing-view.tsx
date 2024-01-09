import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../../settings/layouts/SettingsLayout";
import { OtherTeamsListing } from "./../components/OtherTeamsListing";

const OtherTeamListingView = (): React.ReactElement => {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("org_admin_other_teams")}
        description={t("org_admin_other_teams_description")}
        borderInShellHeader
      />
      <div className="border-subtle rounded-lg rounded-t-none border border-t-0 px-6 py-8">
        <OtherTeamsListing />
      </div>
    </>
  );
};

OtherTeamListingView.getLayout = getLayout;

export default OtherTeamListingView;
