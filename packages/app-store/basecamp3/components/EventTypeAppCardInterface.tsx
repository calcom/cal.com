import useIsAppEnabled from "_utils/useIsAppEnabled";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";

import type { appDataSchema } from "../zod";
import EventTypeAppSettingsInterface from "./EventTypeAppSettingsInterface";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  return (
    <AppCard
      app={app}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}>
      <EventTypeAppSettingsInterface
        slug={app.slug}
        disabled={disabled}
        getAppData={getAppData}
        setAppData={setAppData}
      />
    </AppCard>
  );
};

export default EventTypeAppCard;
