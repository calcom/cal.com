import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import { useEffect } from "react";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";

import type { appDataSchema } from "../zod";
import EventTypeAppSettingsInterface from "./EventTypeAppSettingsInterface";
import { loadSetupConfiguration } from "../lib/setupConfiguration";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({
  app,
  eventType,
  onAppInstallSuccess,
}) {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  useEffect(() => {
    if (!app.isInstalled) return;
    void loadSetupConfiguration(eventType.id).catch(() => undefined);
  }, [app.isInstalled, eventType.id]);

  return (
    <AppCard
      onAppInstallSuccess={onAppInstallSuccess}
      hideSettingsIcon
      app={app}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      teamId={eventType.team?.id || undefined}
    >
      <EventTypeAppSettingsInterface
        disabled={disabled}
        eventType={eventType}
        slug={app.slug}
        getAppData={getAppData}
        setAppData={setAppData} />
    </AppCard>
  );
};

export default EventTypeAppCard;
