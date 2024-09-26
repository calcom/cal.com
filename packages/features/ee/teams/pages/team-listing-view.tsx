"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { TeamsListing } from "../components";

const TeamListingView = ({ isAppDir }: { isAppDir?: boolean }) => {
  const { t } = useLocale();
  return (
    <>
      {!isAppDir ? <Meta title={t("teams")} description={t("create_manage_teams_collaborative")} /> : null}
      <TeamsListing />
    </>
  );
};

export default TeamListingView;
