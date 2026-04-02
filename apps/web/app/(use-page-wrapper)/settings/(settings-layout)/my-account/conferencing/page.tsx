import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";
import { ConferencingAppsViewWebWrapper } from "@calcom/web/modules/apps/components/ConferencingAppsViewWebWrapper";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description"),
    undefined,
    undefined,
    "/settings/my-account/conferencing"
  );

const Page = async () => {
  const [appsCaller, eventTypesCaller] = await Promise.all([
    createRouterCaller(appsRouter),
    createRouterCaller(eventTypesRouter),
  ]);

  const [integrations, defaultConferencingApp, eventTypesQueryData] = await Promise.all([
    appsCaller.integrations({ variant: "conferencing", onlyInstalled: true }),
    appsCaller.getUsersDefaultConferencingApp(),
    eventTypesCaller.bulkEventFetch(),
  ]);

  return (
    <ConferencingAppsViewWebWrapper
      integrations={integrations}
      defaultConferencingApp={defaultConferencingApp}
      eventTypes={eventTypesQueryData?.eventTypes ?? []}
    />
  );
};

export default Page;
