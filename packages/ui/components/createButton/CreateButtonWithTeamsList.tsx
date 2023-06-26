import { trpc } from "@calcom/trpc/react";

import type { CreateBtnProps } from "./CreateButton";
import { CreateButton } from "./CreateButton";

export function CreateButtonWithTeamsList(
  props: Omit<CreateBtnProps, "options"> & { onlyShowWithTeams?: boolean; onlyShowWithNoTeams?: boolean }
) {
  const query = trpc.viewer.teamsAndUserProfilesQuery.useQuery();
  if (!query.data) return null;

  const teamsAndUserProfiles = query.data
    .filter((profile) => !profile.readOnly)
    .map((profile) => {
      return {
        teamId: profile.teamId,
        label: profile.name || profile.slug,
        image: profile.image,
        slug: profile.slug,
      };
    });

  if (props.onlyShowWithTeams && teamsAndUserProfiles.length < 2) return null;

  if (props.onlyShowWithNoTeams && teamsAndUserProfiles.length > 1) return null;

  return <CreateButton {...props} options={teamsAndUserProfiles} />;
}
