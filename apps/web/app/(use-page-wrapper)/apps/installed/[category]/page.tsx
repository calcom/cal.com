import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";
import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { calendarsRouter } from "@calcom/trpc/server/routers/viewer/calendars/_router";

import InstalledApps from "~/apps/installed/[category]/installed-category-view";

const querySchema = z.object({
  category: z.nativeEnum(AppCategories),
});

export const generateMetadata = async ({ params }: { params: Promise<{ category: string }> }) => {
  return await _generateMetadata(
    (t) => t("installed_apps"),
    (t) => t("manage_your_connected_apps"),
    undefined,
    undefined,
    `/apps/installed/${(await params).category}`
  );
};

const InstalledAppsWrapper = async ({ params }: PageProps) => {
  const parsedParams = querySchema.safeParse(await params);

  if (!parsedParams.success) {
    redirect("/apps/installed/calendar");
  }

  const [calendarsCaller, appsCaller] = await Promise.all([
    createRouterCaller(calendarsRouter),
    createRouterCaller(appsRouter),
  ]);

  const connectedCalendars = await calendarsCaller.connectedCalendars();
  const installedCalendars = await appsCaller.integrations({
    variant: "calendar",
    onlyInstalled: true,
  });

  return (
    <InstalledApps
      connectedCalendars={connectedCalendars}
      installedCalendars={installedCalendars}
      category={parsedParams.data.category}
    />
  );
};

export default InstalledAppsWrapper;
