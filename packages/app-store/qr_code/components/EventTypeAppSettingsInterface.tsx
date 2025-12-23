import { useState } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui/components/tooltip";
import classNames from "@calcom/ui/classNames";
import { TextField } from "@calcom/ui/components/form";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({ eventType, disabled }) => {
  const { t } = useLocale();
  const [additionalParameters, setAdditionalParameters] = useState("");
  const query = additionalParameters !== "" ? `?${additionalParameters}` : "";
  const eventTypeURL = eventType.URL + query;

  function QRCode({ size, data }: { size: number; data: string }) {
    const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${data}`;
    return (
      <Tooltip content={eventTypeURL}>
        <a download href={QR_URL} target="_blank" rel="noreferrer">
          <img
            className={classNames(
              "hover:bg-cal-muted border-default border transition hover:shadow-sm",
              size >= 256 && "min-h-32"
            )}
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
    <div className="flex w-full flex-col gap-5 text-sm">
      <div className="flex w-full">
        <TextField
          name="hello"
          disabled={disabled}
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
  );
};

export default EventTypeAppSettingsInterface;
