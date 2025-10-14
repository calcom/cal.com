"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import OtherTeamList from "./OtherTeamList";

type OtherTeamsListingProps = {
  teams: Awaited<ReturnType<typeof OrganizationRepository.findTeamsInOrgIamNotPartOf>>;
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
