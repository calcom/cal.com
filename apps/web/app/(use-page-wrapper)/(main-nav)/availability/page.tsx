import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

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

const Page = async ({ searchParams: _searchParams }: PageProps) => {
  const searchParams = await _searchParams;
  const t = await getTranslate();

  const [meCaller, availabilityCaller] = await Promise.all([
    createRouterCaller(meRouter),
    createRouterCaller(availabilityRouter),
  ]);

  const [me, availabilities] = await Promise.all([meCaller.get(), availabilityCaller.list()]);
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
