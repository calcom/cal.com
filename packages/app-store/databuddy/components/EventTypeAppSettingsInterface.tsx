import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { TextField } from "@calcom/ui/components/form";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
  slug,
}) => {
  const databuddy_script = getAppData("DATABUDDY_SCRIPT_URL");
  const databuddy_api = getAppData("DATABUDDY_API_URL");
  const client_id = getAppData("CLIENT_ID");

  return (
    <div className="flex flex-col gap-2">
      <TextField
        dataTestid={`${slug}-url`}
        name="DataBuddy Script URL"
        defaultValue="https://cdn.databuddy.cc/databuddy.js"
        placeholder="https://cdn.databuddy.cc/databuddy.js"
        value={databuddy_script}
        disabled={disabled}
        onChange={(e) => {
          setAppData("DATABUDDY_SCRIPT_URL", e.target.value);
        }}
      />
      <TextField
        dataTestid={`${slug}-api-url`}
        name="DataBuddy API URL"
        defaultValue="https://basket.databuddy.cc"
        placeholder="https://basket.databuddy.cc"
        value={databuddy_api}
        disabled={disabled}
        onChange={(e) => {
          setAppData("DATABUDDY_API_URL", e.target.value);
        }}
      />
      <TextField
        dataTestid={`${slug}-client-id`}
        disabled={disabled}
        name="Client ID"
        placeholder="databuddy-client-id"
        value={client_id}
        onChange={(e) => {
          setAppData("CLIENT_ID", e.target.value);
        }}
      />
    </div>
  );
};

export default EventTypeAppSettingsInterface;
