import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const plausibleUrl = getAppData("PLAUSIBLE_URL");
  const trackingId = getAppData("trackingId");
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  return (
    <AppCard
      app={app}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      teamId={eventType.team?.id || undefined}>
      <div className="flex flex-col gap-2">
        <TextField
          name="Plausible URL"
          defaultValue="https://plausible.io/js/script.js"
          placeholder="https://plausible.io/js/script.js"
          value={plausibleUrl}
          disabled={disabled}
          onChange={(e) => {
            setAppData("PLAUSIBLE_URL", e.target.value);
          }}
        />
        <TextField
          disabled={disabled}
          name="Tracked Domain"
          placeholder="yourdomain.com"
          value={trackingId}
          onChange={(e) => {
            setAppData("trackingId", e.target.value);
          }}
        />
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
