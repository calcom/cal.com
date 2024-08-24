import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const siteId = getAppData("SITE_ID");
  const scriptURL = getAppData("SCRIPT_URL");
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  return (
    <AppCard
      app={app}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      teamId={eventType.team?.id || undefined}>
      <fieldset className="space-y-2" disabled={disabled}>
        <TextField
          disabled={disabled}
          name="Script URL"
          value={scriptURL}
          defaultValue="https://us.umami.is/script.js"
          placeholder="Enter the script source URL"
          onChange={(e) => {
            setAppData("SCRIPT_URL", e.target.value);
          }}
        />
        <TextField
          disabled={disabled}
          name="Site ID"
          value={siteId}
          placeholder="Enter your Site ID"
          onChange={(e) => {
            setAppData("SITE_ID", e.target.value);
          }}
        />
      </fieldset>
    </AppCard>
  );
};

export default EventTypeAppCard;
