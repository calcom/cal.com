import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { MembershipRole } from "@calcom/prisma/enums";
import { EventGroupBuilder } from "@calcom/trpc/server/routers/viewer/eventTypes/usecases/EventGroupBuilder";
import { EventTypeGroupFilter } from "@calcom/trpc/server/routers/viewer/eventTypes/utils/EventTypeGroupFilter";
import { ProfilePermissionProcessor } from "@calcom/trpc/server/routers/viewer/eventTypes/usecases/ProfilePermissionProcessor";
import { TeamAccessUseCase } from "@calcom/trpc/server/routers/viewer/eventTypes/teamAccessUseCase";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { EventTypesWrapper } from "./EventTypesWrapper";

const getCachedEventGroups = unstable_cache(
  async (
    userId: number,
    userUpId: string,
    filters?: {
      teamIds?: number[] | undefined;
      userIds?: number[] | undefined;
      upIds?: string[] | undefined;
    }
  ) => {
    const dependencies = {
      membershipRepository: MembershipRepository,
      profileRepository: ProfileRepository,
      teamAccessUseCase: new TeamAccessUseCase(),
    };

    const eventGroupBuilder = new EventGroupBuilder(dependencies);
    const { eventTypeGroups, teamPermissionsMap } = await eventGroupBuilder.buildEventGroups({
      userId,
      userUpId,
      filters,
    });

    const filteredEventTypeGroups = new EventTypeGroupFilter(eventTypeGroups, teamPermissionsMap)
      .has("eventType.read")
      .get();

    const profileProcessor = new ProfilePermissionProcessor();
    const profiles = profileProcessor.processProfiles(eventTypeGroups, teamPermissionsMap);

    const permissionCheckService = new PermissionCheckService();

    const teamIdsToCheck = filteredEventTypeGroups
      .map((group) => group.teamId)
      .filter((teamId): teamId is number => teamId !== null && teamId !== undefined);

    const teamPermissionChecks = teamIdsToCheck.map(async (teamId) => {
      const canCreateEventType = await permissionCheckService.checkPermission({
        userId,
        teamId: teamId,
        permission: "eventType.create",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
      return {
        teamId,
        permissions: {
          canCreateEventType,
        },
      };
    });

    const teamPermissionsArray = await Promise.all(teamPermissionChecks);
    const teamPermissions = teamPermissionsArray.reduce(
      (acc, item) => {
        acc[item.teamId] = item.permissions;
        return acc;
      },
      {} as Record<number, { canCreateEventType: boolean }>
    );

    return {
      eventTypeGroups: filteredEventTypeGroups,
      profiles,
      teamPermissions,
    };
  },
  ["viewer.eventTypes.getUserEventGroups"],
  { revalidate: 3600, tags: ["viewer.eventTypes.getUserEventGroups"] }
);

const Page = async ({ searchParams }: PageProps): Promise<ReactElement> => {
  const _searchParams = await searchParams;
  const _headers = await headers();
  const _cookies = await cookies();

  const session = await getServerSession({
    req: buildLegacyRequest(_headers, _cookies),
  });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    return redirect(onboardingPath);
  }

  if (!session.user.profile?.upId) {
    return redirect("/auth/login");
  }

  const filters = getTeamsFiltersFromQuery(_searchParams);
  const userEventGroupsData = await getCachedEventGroups(
    session.user.id,
    session.user.profile.upId,
    filters
  );

  return (
    <EventTypesWrapper
      userEventGroupsData={userEventGroupsData}
      user={session.user}
    />
  );
};

export const generateMetadata = async (): Promise<
  ReturnType<typeof _generateMetadata>
> =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle"),
    undefined,
    undefined,
    "/event-types"
  );

export default Page;
