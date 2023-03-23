import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { FiSunrise, FiSunset } from "@calcom/ui/components/icon";

import { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const isSunrise = getAppData("isSunrise");
  const [enabled, setEnabled] = useState(getAppData("enabled"));

  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          setEnabled(false);
          setAppData("isSunrise", false);
        } else {
          setEnabled(true);
          setAppData("isSunrise", true);
        }
      }}
      switchChecked={enabled}>
      <div className="mt-2 text-sm">
        <div className="flex">
          <span className="ltr:mr-2 rtl:ml-2">{isSunrise ? <FiSunrise /> : <FiSunset />}</span>I am an AppCard
          for Event with Title: {eventType.title}
        </div>{" "}
        <div className="mt-2">
          Edit <span className="italic">packages/app-store/{app.slug}/EventTypeAppCardInterface.tsx</span> to
          play with me
        </div>
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
