import React, { useState } from "react";

// import { useFormContext } from "react-hook-form";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { Icon } from "@calcom/ui";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  //const formMethods = useFormContext();
  const [checked, setChecked] = useState(false);
  return (
    <AppCard
      app={app}
      switchOnClick={(e) => {
        setChecked(e);
      }}
      switchChecked={checked}>
      <div className="mt-2 text-sm">
        <div className="flex">
          <span className="mr-2">{checked ? <Icon.FiSunrise /> : <Icon.FiSunset />}</span>I am an AppCard for
          Event with Title: {eventType.title}
        </div>
        <div className="mt-2">
          Edit <span className="italic">packages/app-store/{app.slug}/extensions/EventTypeAppCard.tsx</span>{" "}
          to play with me
        </div>
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
