import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip, TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const { t } = useLocale();
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const [enabled, setEnabled] = useState(getAppData("enabled"));
  const [additionalParameters, setAdditionalParameters] = useState("");

  const query = additionalParameters !== "" ? `?${additionalParameters}` : "";
  const eventTypeURL = eventType.URL + query;

  function QRCode({ size, data }: { size: number; data: string }) {
    const QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "&data=" + data;
    return (
      <Tooltip content={eventTypeURL}>
        <a download href={QR_URL} target="_blank" rel="noreferrer">
          <img
            className="hover:bg-muted border-default border hover:shadow-sm"
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
      <div className="flex w-full flex-col gap-2 text-sm">
        <div className="flex w-full">
          <TextField
            name="hello"
            value={additionalParameters}
            onChange={(e) => setAdditionalParameters(e.target.value)}
            label={t("additional_url_parameters")}
            containerClassName="w-full"
          />
        </div>

        <div className="max-w-60 flex items-baseline gap-2">
          <QRCode size={256} data={eventTypeURL} />
          <QRCode size={128} data={eventTypeURL} />
          <QRCode size={64} data={eventTypeURL} />
        </div>
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
