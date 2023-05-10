import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const plausibleUrl = getAppData("PLAUSIBLE_URL");
  const trackingId = getAppData("trackingId");
  const [enabled, setEnabled] = useState(getAppData("enabled"));

  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          setEnabled(false);
        } else {
          setEnabled(true);
        }
      }}
      switchChecked={enabled}>
      <TextField
        name="Plausible URL"
        defaultValue="https://plausible.io/js/script.js"
        placeholder="https://plausible.io/js/script.js"
        value={plausibleUrl}
        onChange={(e) => {
          setAppData("PLAUSIBLE_URL", e.target.value);
        }}
      />
      <TextField
        name="Tracked Domain"
        placeholder="yourdomain.com"
        value={trackingId}
        onChange={(e) => {
          setAppData("trackingId", e.target.value);
        }}
      />
    </AppCard>
  );
};

export default EventTypeAppCard;
