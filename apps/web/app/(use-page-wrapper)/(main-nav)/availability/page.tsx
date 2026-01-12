import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import { getScheduleListItemData } from "@calcom/lib/schedules/transformers/getScheduleListItemData";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { AvailabilitySliderTable } from "@calcom/web/modules/timezone-buddy/components/AvailabilitySliderTable";

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
  async (userId: number) => {
    const schedules = await prisma.schedule.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        availability: true,
        timeZone: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (schedules.length === 0) {
      return {
        schedules: [],
      };
    }

    let defaultScheduleId: number | null;
    try {
      const scheduleRepository = new ScheduleRepository(prisma);
      defaultScheduleId = await scheduleRepository.getDefaultScheduleId(userId);
    } catch {
      defaultScheduleId = null;
    }

    return {
      schedules: schedules.map((schedule) => ({
        ...schedule,
        isDefault: schedule.id === defaultScheduleId,
      })),
    };
  },
  ["viewer.availability.list"],
  { revalidate: 3600, tags: ["viewer.availability.list"] }
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

  const cachedAvailabilities = await getCachedAvailabilities(session.user.id);

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

  return (
    <ShellMainAppDir
      heading={t("availability")}
      subtitle={t("configure_availability")}
      CTA={<AvailabilityCTA canViewTeamAvailability={canViewTeamAvailability} />}>
      {searchParams?.type === "team" && canViewTeamAvailability ? (
        <AvailabilitySliderTable isOrg={!!organizationId} />
      ) : (
        <AvailabilityList availabilities={availabilities ?? { schedules: [] }} />
      )}
    </ShellMainAppDir>
  );
};

export default Page;
