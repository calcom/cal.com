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
  const {
    onlyShowWithTeams,
    onlyShowWithNoTeams,
    isAdmin,
    includeOrg,
    withPermission: withPermissionProps,
    ...buttonProps
  } = props;
  const withPermission = withPermissionProps
    ? {
        permission: withPermissionProps.permission,
        fallbackRoles: withPermissionProps.fallbackRoles,
      }
    : undefined;

  const query = trpc.viewer.loggedInViewerRouter.teamsAndUserProfilesQuery.useQuery({
    includeOrg,
    withPermission,
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

  if (isAdmin) {
    teamsAndUserProfiles.push({
      platform: true,
      label: "Platform",
      image: null,
      slug: null,
      teamId: null,
    });
  }

  if (onlyShowWithTeams && teamsAndUserProfiles.length < 2) return null;

  if (onlyShowWithNoTeams && teamsAndUserProfiles.length > 1) return null;

  return <CreateButton {...buttonProps} options={teamsAndUserProfiles} />;
}
