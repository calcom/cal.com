import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { AvailabilitySliderTable } from "@calcom/features/timezone-buddy/components/AvailabilitySliderTable";
import { MembershipRole } from "@calcom/prisma/enums";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { AvailabilityList, AvailabilityCTA } from "~/availability/availability-view";

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
    schedules: cachedAvailabilities.schedules.map((schedule) => ({
      ...schedule,
      availability: schedule.availability.map((avail) => ({
        ...avail,
        startTime: new Date(avail.startTime),
        endTime: new Date(avail.endTime),
        date: avail.date ? new Date(avail.date) : null,
      })),
    })),
  };

  const organizationId = session?.user?.profile?.organizationId ?? session?.user.org?.id;
  const isOrgPrivate = organizationId
    ? await OrganizationRepository.checkIfPrivate({
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

  return (
    <ShellMainAppDir
      heading={t("availability")}
      subtitle={t("configure_availability")}
      CTA={
        <AvailabilityCTA
          toggleGroupOptions={[
            { value: "mine", label: t("my_availability") },
            ...(canViewTeamAvailability ? [{ value: "team", label: t("team_availability") }] : []),
          ]}
        />
      }>
      {searchParams?.type === "team" && canViewTeamAvailability ? (
        <AvailabilitySliderTable isOrg={!!organizationId} />
      ) : (
        <AvailabilityList availabilities={availabilities ?? { schedules: [] }} />
      )}
    </ShellMainAppDir>
  );
};

export default Page;
