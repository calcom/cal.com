import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui/components/form";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
  slug,
}) => {
  const plausibleUrl = getAppData("PLAUSIBLE_URL");
  const trackingId = getAppData("trackingId");

  return (
    <div className="flex flex-col gap-2">
      <TextField
        dataTestid={`${slug}-url`}
        name="Plausible URL"
        defaultValue="https://plausible.io/js/script.js"
        placeholder="https://plausible.io/js/script.js"
        value={plausibleUrl}
        disabled={disabled}
        onChange={(e) => {
          setAppData("PLAUSIBLE_URL", e.target.value);
        }}
      />
      <TextField
        dataTestid={`${slug}-tracking-id`}
        disabled={disabled}
        name="Tracked Domain"
        placeholder="yourdomain.com"
        value={trackingId}
        onChange={(e) => {
          setAppData("trackingId", e.target.value);
        }}
      />
    </div>
  );
};

export default EventTypeAppSettingsInterface;
