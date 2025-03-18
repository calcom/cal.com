"use client";

import { useTeamsAndUserProfiles } from "@calcom/features/ee/teams/hooks/useTeamsAndUserProfiles";

import type { CreateBtnProps, Option } from "./CreateButton";
import { CreateButton } from "./CreateButton";

export function CreateButtonWithTeamsList(
  props: Omit<CreateBtnProps, "options"> & {
    onlyShowWithTeams?: boolean;
    onlyShowWithNoTeams?: boolean;
    isAdmin?: boolean;
    includeOrg?: boolean;
  }
) {
  const teamsAndUserProfiles = useTeamsAndUserProfiles() as Option[];

  if (props.isAdmin) {
    teamsAndUserProfiles.push({
      platform: true,
      label: "Platform",
      image: null,
      slug: null,
      teamId: null,
    });
  }

  if (props.onlyShowWithTeams && teamsAndUserProfiles.length < 2) return null;

  if (props.onlyShowWithNoTeams && teamsAndUserProfiles.length > 1) return null;

  return <CreateButton {...props} options={teamsAndUserProfiles} />;
}
