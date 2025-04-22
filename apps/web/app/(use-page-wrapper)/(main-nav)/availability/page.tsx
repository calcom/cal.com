import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { AvailabilitySliderTable } from "@calcom/features/timezone-buddy/components/AvailabilitySliderTable";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

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
  try {
    const [meCaller, orgCaller, availabilityCaller] = await Promise.all([
      createRouterCaller(meRouter),
      createRouterCaller(viewerOrganizationsRouter),
      createRouterCaller(availabilityRouter),
    ]);

    const me = await meCaller.get();
    const organizationId = me.organization?.id ?? me.profiles[0]?.organizationId;
    let currentOrgs = null;
    let canViewTeamAvailability = me.isTeamAdminOrOwner;

    if (organizationId) {
      currentOrgs = await orgCaller.listCurrent();
      const isOrgAdminOrOwner = currentOrgs && checkAdminOrOwner(currentOrgs.user.role);
      const isOrgAndPrivate = currentOrgs?.isOrganization && currentOrgs.isPrivate;
      canViewTeamAvailability = isOrgAdminOrOwner || !isOrgAndPrivate;
    }

    const isTeamView = searchParams?.type === "team" && canViewTeamAvailability;
    const availabilities = !isTeamView ? await availabilityCaller.list() : null;

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
        {isTeamView ? (
          <AvailabilitySliderTable userTimeFormat={me?.timeFormat ?? null} isOrg={!!organizationId} />
        ) : (
          <AvailabilityList availabilities={availabilities ?? { schedules: [] }} me={me} />
        )}
      </ShellMainAppDir>
    );
  } catch (error) {
    notFound();
  }
};

export default Page;
