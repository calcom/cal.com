import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  // Additional data retrieval
  const plausibleUrl = getAppData("PLAUSIBLE_URL");
  const trackingId = getAppData("trackingId");

  const handleToggleEnabled = (value: boolean) => {
    updateEnabled(value);
  };

  return (
    <AppCard
      app={app}
      switchOnClick={handleToggleEnabled}
      switchChecked={enabled}
      teamId={eventType.team?.id || undefined}>
      <div className="flex flex-col gap-2">
        <label>
          Activate Plausible
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            disabled={disabled}
          />
        </label>
        <label>
          Plausible URL
          <input
            type="text"
            value={plausibleUrl}
            onChange={(e) => setAppData("PLAUSIBLE_URL", e.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          Tracked Domain
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setAppData("trackingId", e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>
    </AppCard>
  );
};
