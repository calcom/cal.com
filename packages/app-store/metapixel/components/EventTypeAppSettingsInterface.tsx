import { useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { Label, Select, TextField } from "@calcom/ui/components/form";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
}) => {
  const trackingId = getAppData("trackingId");
  const trackingEvent = getAppData("trackingEvent");

  type EventOption = { label: string; value: string };
  const eventOptions: EventOption[] = [
    { label: "Lead", value: "Lead" },
    { label: "Complete Registration", value: "CompleteRegistration" },
    { label: "Schedule", value: "Schedule" },
    { label: "Page View (use for custom tracking)", value: "PageView" },
  ];

  const currentOption = eventOptions.find((e) => e.value === trackingEvent) || eventOptions[0];

  useEffect(() => {
    if (!trackingEvent) {
      setAppData("trackingEvent", "Lead");
    }
  }, [trackingEvent, setAppData]);

  return (
    <div className="flex flex-col gap-2">
      <TextField
        name="Pixel ID"
        value={trackingId}
        disabled={disabled}
        onChange={(e) => {
          setAppData("trackingId", e.target.value);
        }}
      />
      <div className="flex flex-col gap-1">
        <Label>Select Conversion Event to Fire</Label>
        <Select
          options={eventOptions}
          value={currentOption}
          isDisabled={disabled}
          isSearchable={false}
          onChange={(e) => {
            setAppData("trackingEvent", e?.value ?? "Lead");
          }}
        />
      </div>
    </div>
  );
};

export default EventTypeAppSettingsInterface;
