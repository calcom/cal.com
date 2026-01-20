import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { calendarsRouter } from "@calcom/trpc/server/routers/viewer/calendars/_router";

import { CalendarListContainer } from "@components/apps/CalendarListContainer";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("calendars"),
    (t) => t("calendars_description"),
    undefined,
    undefined,
    "/settings/my-account/calendars"
  );

const Page = async () => {
  const [calendarsCaller, appsCaller] = await Promise.all([
    createRouterCaller(calendarsRouter),
    createRouterCaller(appsRouter),
  ]);

  const [connectedCalendars, installedCalendars] = await Promise.all([
    calendarsCaller.connectedCalendars(),
    appsCaller.integrations({
      variant: "calendar",
      onlyInstalled: true,
    }),
  ]);
  return (
    <CalendarListContainer connectedCalendars={connectedCalendars} installedCalendars={installedCalendars} />
  );
};

export default Page;
