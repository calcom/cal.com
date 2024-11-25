"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { OtherTeamsListing } from "./../components/OtherTeamsListing";

const OtherTeamListingView = (): React.ReactElement => {
  const { t } = useLocale();
  return (
    <>
      <OtherTeamsListing />
    </>
  );
};

export default OtherTeamListingView;
