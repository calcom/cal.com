"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { OtherTeamsListing } from "./../components/OtherTeamsListing";

const OtherTeamListingView = ({ isAppDir }: { isAppDir?: boolean }): React.ReactElement => {
  const { t } = useLocale();
  return (
    <>
      {!isAppDir ? (
        <Meta title={t("org_admin_other_teams")} description={t("org_admin_other_teams_description")} />
      ) : null}
      <OtherTeamsListing />
    </>
  );
};

export default OtherTeamListingView;
