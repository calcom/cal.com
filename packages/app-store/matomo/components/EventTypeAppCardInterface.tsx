import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const matomoUrl = getAppData("MATOMO_URL");
  const siteId = getAppData("SITE_ID");
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
          name="Matomo URL"
          placeholder="Enter your Matomo URL here"
          value={matomoUrl}
          disabled={disabled}
          onChange={(e) => {
            setAppData("MATOMO_URL", e.target.value);
          }}
        />
        <TextField
          disabled={disabled}
          name="Site ID"
          placeholder="Enter your Site ID"
          value={siteId}
          onChange={(e) => {
            setAppData("SITE_ID", e.target.value);
          }}
        />
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
