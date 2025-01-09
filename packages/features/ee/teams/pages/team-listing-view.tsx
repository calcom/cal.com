"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { TeamsListing } from "../components";

const TeamListingView = () => {
  const { t } = useLocale();
  return <TeamsListing />;
};

export default TeamListingView;
