import { EventTypeSetupInfered } from "pages/event-types/[type]";

import EventTypeAppContext, { GetAppData, SetAppData } from "@calcom/app-store/EventTypeAppContext";
import { AppSettingsComponentsMap, EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
import { EventTypeAppCardComponentProps } from "@calcom/app-store/types";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { ErrorBoundary } from "@calcom/ui";

import { DynamicComponent } from "./DynamicComponent";

type EventType = Pick<EventTypeSetupInfered, "eventType">["eventType"] &
  EventTypeAppCardComponentProps["eventType"];

export const EventTypeAppCard = (props: {
  app: inferQueryOutput<"viewer.apps">[number];
  eventType: EventType;
  getAppData: GetAppData;
  setAppData: SetAppData;
}) => {
  const { app, getAppData, setAppData } = props;
  return (
    <ErrorBoundary message={`There is some problem with ${app.name} App`}>
      <EventTypeAppContext.Provider value={[getAppData, setAppData]}>
        <DynamicComponent slug={app.slug} componentMap={EventTypeAddonMap} {...props} />
      </EventTypeAppContext.Provider>
    </ErrorBoundary>
  );
};
