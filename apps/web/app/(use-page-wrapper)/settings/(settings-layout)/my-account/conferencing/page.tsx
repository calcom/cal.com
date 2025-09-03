import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

import { ConferencingAppsViewWebWrapper } from "@calcom/atoms/connect/conferencing-apps/ConferencingAppsViewWebWrapper";
import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { bulkEventFetchRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/bulkEventFetch/_router";

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
    createRouterCaller(bulkEventFetchRouter),
  ]);

  const [integrations, defaultConferencingApp, eventTypesQueryData] = await Promise.all([
    appsCaller.integrations({ variant: "conferencing", onlyInstalled: true }),
    appsCaller.getUsersDefaultConferencingApp(),
    eventTypesCaller.get(),
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
