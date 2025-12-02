import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { AvailabilitySliderTable } from "@calcom/features/timezone-buddy/components/AvailabilitySliderTable";
import { getScheduleListItemData } from "@calcom/lib/schedules/transformers/getScheduleListItemData";
import { MembershipRole } from "@calcom/prisma/enums";
import { prisma } from "@calcom/prisma";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { AvailabilityList, AvailabilityCTA } from "~/availability/availability-view";
import { HolidaysView } from "~/availability/holidays-view";

import { ShellMainAppDir } from "../ShellMainAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    (t) => t("configure_availability"),
    undefined,
    undefined,
    "/availability"
  );
};

const getCachedAvailabilities = unstable_cache(
  async (headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const availabilityCaller = await createRouterCaller(
      availabilityRouter,
      await getTRPCContext(headers, cookies)
    );
    return await availabilityCaller.list();
  },
  ["viewer.availability.list"],
  { revalidate: 3600 } // Cache for 1 hour
);

const Page = async ({ searchParams: _searchParams }: PageProps) => {
  const searchParams = await _searchParams;
  const t = await getTranslate();
  const _headers = await headers();
  const _cookies = await cookies();
  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const cachedAvailabilities = await getCachedAvailabilities(_headers, _cookies);

  // Transform the data to ensure startTime, endTime, and date are Date objects
  // This is because the data is cached and as a result the data is converted to a string
  const availabilities = {
    ...cachedAvailabilities,
    schedules: cachedAvailabilities.schedules.map((schedule) => getScheduleListItemData(schedule)),
  };

  const organizationId = session?.user?.profile?.organizationId ?? session?.user.org?.id;
  const organizationRepository = getOrganizationRepository();
  const isOrgPrivate = organizationId
    ? await organizationRepository.checkIfPrivate({
      orgId: organizationId,
    })
    : false;

  const permissionService = new PermissionCheckService();
  const teamIdsWithPermission = await permissionService.getTeamIdsWithPermission({
    userId: session.user.id,
    permission: "availability.read",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });
  const canViewTeamAvailability = teamIdsWithPermission.length > 0 || !isOrgPrivate;

  // Check if holidays feature is enabled
  const featuresRepository = new FeaturesRepository(prisma);
  const isHolidaysEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("holidays");

  // If holidays tab is accessed but feature is disabled, redirect
  if (searchParams?.type === "holidays" && !isHolidaysEnabled) {
    redirect("/availability");
  }

  return (
    <ShellMainAppDir
      heading={t("availability")}
      subtitle={t("configure_availability")}
      CTA={
        <AvailabilityCTA canViewTeamAvailability={canViewTeamAvailability} />
      }>
      {searchParams?.type === "team" && canViewTeamAvailability ? (
        <AvailabilitySliderTable isOrg={!!organizationId} />
      ) : searchParams?.type === "holidays" && isHolidaysEnabled ? (
        <HolidaysView />
      ) : (
        <AvailabilityList availabilities={availabilities ?? { schedules: [] }} />
      )}
    </ShellMainAppDir>
  );
};

export default Page;
