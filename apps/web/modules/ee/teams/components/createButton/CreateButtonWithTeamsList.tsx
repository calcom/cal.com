"use client";

import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import type { CreateBtnProps, Option } from "./CreateButton";
import { CreateButton } from "./CreateButton";

export function CreateButtonWithTeamsList(
  props: Omit<CreateBtnProps, "options"> & {
    onlyShowWithTeams?: boolean;
    onlyShowWithNoTeams?: boolean;
    isAdmin?: boolean;
    includeOrg?: boolean;
    withPermission?: {
      permission: PermissionString;
      fallbackRoles?: MembershipRole[];
    };
  }
) {
  const query = trpc.viewer.loggedInViewerRouter.teamsAndUserProfilesQuery.useQuery({
    includeOrg: props.includeOrg,
    withPermission: props.withPermission
      ? {
          permission: props.withPermission.permission,
          fallbackRoles: props.withPermission.fallbackRoles,
        }
      : undefined,
  });
  if (!query.data) return null;

  const teamsAndUserProfiles: Option[] = query.data
    .filter((profile) => !profile.readOnly)
    .map((profile) => {
      return {
        teamId: profile.teamId,
        label: profile.name || profile.slug,
        image: profile.image,
        slug: profile.slug,
      };
    });

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
