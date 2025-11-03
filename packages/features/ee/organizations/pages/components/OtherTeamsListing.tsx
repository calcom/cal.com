"use client";

import { organizationRepository } from "@calcom/features/ee/organizations/repositories";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import OtherTeamList from "./OtherTeamList";

type OtherTeamsListingProps = {
  teams: Awaited<ReturnType<typeof organizationRepository.findTeamsInOrgIamNotPartOf>>;
};
export function OtherTeamsListing({ teams }: OtherTeamsListingProps) {
  const { t } = useLocale();

  return (
    <>
      {teams && teams.length > 0 ? (
        <OtherTeamList teams={teams} />
      ) : (
        <EmptyScreen
          headline={t("no_other_teams_found")}
          title={t("no_other_teams_found")}
          description={t("no_other_teams_found_description")}
        />
      )}
    </>
  );
}
