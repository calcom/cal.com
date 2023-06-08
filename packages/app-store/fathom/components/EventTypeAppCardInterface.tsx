import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const trackingId = getAppData("trackingId");
  const { enabled, updateEnabled } = useIsAppEnabled(app, getAppData, setAppData);

  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          updateEnabled(false);
        } else {
          updateEnabled(true);
        }
      }}
      switchChecked={enabled}
      teamId={eventType.team?.id || undefined}>
      <TextField
        name="Tracking ID"
        value={trackingId}
        onChange={(e) => {
          setAppData("trackingId", e.target.value);
        }}
      />
    </AppCard>
  );
};

export default EventTypeAppCard;
