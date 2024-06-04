import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
}) => {
  const trackingId = getAppData("trackingId");

  return (
    <TextField
      name="Tracking ID"
      value={trackingId}
      disabled={disabled}
      onChange={(e) => {
        setAppData("trackingId", e.target.value);
      }}
    />
  );
};

export default EventTypeAppSettingsInterface;
