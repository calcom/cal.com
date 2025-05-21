import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";

import { AvailabilitySliderTable } from "@calcom/features/timezone-buddy/components/AvailabilitySliderTable";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";

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

const getCachedMe = unstable_cache(
  async (headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const meCaller = await createRouterCaller(meRouter, await getTRPCContext(headers, cookies));
    return await meCaller.get();
  },
  ["viewer.me.get"],
  { revalidate: 3600 } // Cache for 1 hour
);

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

  const [me, cachedAvailabilities] = await Promise.all([
    getCachedMe(_headers, _cookies),
    getCachedAvailabilities(_headers, _cookies),
  ]);

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

  const organizationId = me.organization?.id ?? me.profiles[0]?.organizationId;
  const isOrgPrivate = organizationId
    ? await OrganizationRepository.checkIfPrivate({
        orgId: organizationId,
      })
    : false;
  const canViewTeamAvailability = me.organization?.isOrgAdmin || !isOrgPrivate;

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
        <AvailabilitySliderTable userTimeFormat={me?.timeFormat ?? null} isOrg={!!organizationId} />
      ) : (
        <AvailabilityList availabilities={availabilities ?? { schedules: [] }} me={me} />
      )}
    </ShellMainAppDir>
  );
};

export default Page;
