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
  try {
    const searchParams = await _searchParams;
    const t = await getTranslate();
    const [meCaller, orgCaller] = await Promise.all([
      createRouterCaller(meRouter),
      createRouterCaller(viewerOrganizationsRouter),
    ]);
    const [currentOrgs, me] = await Promise.all([orgCaller.listCurrent(), meCaller.get()]);

    const isOrg = Boolean(currentOrgs);
    const isOrgAdminOrOwner = (currentOrgs && checkAdminOrOwner(currentOrgs.user.role)) ?? false;
    const isOrgAndPrivate = currentOrgs?.isOrganization && currentOrgs.isPrivate;

    const canViewTeamAvailability = isOrgAdminOrOwner || !isOrgAndPrivate;

    const toggleGroupOptions = [{ value: "mine", label: t("my_availability") }];

    if (canViewTeamAvailability) {
      toggleGroupOptions.push({ value: "team", label: t("team_availability") });
    }

    let contents = null;
    if (searchParams?.type === "team" && canViewTeamAvailability) {
      contents = <AvailabilitySliderTable userTimeFormat={me?.timeFormat ?? null} isOrg={isOrg} />;
    } else {
      const availabilityCaller = await createRouterCaller(availabilityRouter);
      const availabilities = await availabilityCaller.list();
      contents = <AvailabilityList availabilities={availabilities} me={me} />;
    }

    return (
      <ShellMainAppDir
        heading={t("availability")}
        subtitle={t("configure_availability")}
        CTA={<AvailabilityCTA />}>
        {contents}
      </ShellMainAppDir>
    );
  } catch {
    notFound();
  }
};

export default Page;
