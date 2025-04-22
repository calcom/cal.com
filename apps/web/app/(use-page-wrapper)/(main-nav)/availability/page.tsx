import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";

import { AvailabilitySliderTable } from "@calcom/features/timezone-buddy/components/AvailabilitySliderTable";
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
  try {
    const [meCaller, availabilityCaller] = await Promise.all([
      createRouterCaller(meRouter),
      createRouterCaller(availabilityRouter),
    ]);

    const me = await meCaller.get();
    const organizationId = me.organization?.id ?? me.profiles[0]?.organizationId;
    const isTeamView = searchParams?.type === "team";
    const availabilities = !isTeamView ? await availabilityCaller.list() : null;

    return (
      <ShellMainAppDir
        heading={t("availability")}
        subtitle={t("configure_availability")}
        CTA={
          <AvailabilityCTA
            toggleGroupOptions={[
              { value: "mine", label: t("my_availability") },
              { value: "team", label: t("team_availability") },
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
