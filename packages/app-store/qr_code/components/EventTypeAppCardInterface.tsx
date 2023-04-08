import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { Tooltip } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const [enabled, setEnabled] = useState(getAppData("enabled"));

  const eventTypeURL = eventType.URL;

  function QRCode({ size, data }: { size: number; data: string }) {
    const QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "&data=" + data;
    return (
      <Tooltip content={eventTypeURL}>
        <a download href={QR_URL} target="_blank" rel="noreferrer">
          <img
            className="hover:bg-muted border hover:shadow-sm"
            style={{ padding: size / 16, borderRadius: size / 20 }}
            width={size}
            src={QR_URL}
            alt={eventTypeURL}
          />
        </a>
      </Tooltip>
    );
  }

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
      <div className="max-w-60 flex items-baseline justify-between gap-2 text-sm ">
        <QRCode size={256} data={eventTypeURL} />
        <QRCode size={128} data={eventTypeURL} />
        <QRCode size={64} data={eventTypeURL} />
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
