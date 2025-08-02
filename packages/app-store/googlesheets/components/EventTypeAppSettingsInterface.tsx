import { useState } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
  slug,
}) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const enabled = getAppData("enabled") || false;
  const spreadsheetUrl = getAppData("spreadsheetUrl") || "";

  const extractSpreadsheetId = (url: string): string | null => {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleUrlChange = (url: string) => {
    setAppData("spreadsheetUrl", url);
    const spreadsheetId = extractSpreadsheetId(url);
    if (spreadsheetId) {
      setAppData("spreadsheetId", spreadsheetId);
    } else {
      setAppData("spreadsheetId", "");
    }
  };

  const testConnection = async () => {
    if (!spreadsheetUrl) {
      showToast("Please enter a Google Sheets URL first", "error");
      return;
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      showToast("Invalid Google Sheets URL format", "error");
      return;
    }

    setIsTestingConnection(true);
    try {
      // Test connection by trying to access the spreadsheet
      const response = await fetch(`/api/integrations/googlesheets/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spreadsheetId }),
      });

      if (response.ok) {
        showToast("Connection successful! Google Sheets is accessible.", "success");
      } else {
        const error = await response.text();
        showToast(`Connection failed: ${error}`, "error");
      }
    } catch (error) {
      showToast("Connection test failed. Please check your URL and permissions.", "error");
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setAppData("enabled", e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label className="text-sm font-medium">Enable Google Sheets export for this event type</label>
      </div>

      {enabled && (
        <div className="space-y-4">
          <TextField
            dataTestid={`${slug}-spreadsheet-url`}
            name="Google Sheets URL"
            placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit"
            value={spreadsheetUrl}
            disabled={disabled}
            onChange={(e) => handleUrlChange(e.target.value)}
            label="Google Sheets URL"
            hint="Paste the full URL of your Google Sheets document"
          />

          {spreadsheetUrl && (
            <Button
              type="button"
              onClick={testConnection}
              disabled={disabled || isTestingConnection}
              loading={isTestingConnection}>
              {isTestingConnection ? "Testing..." : "Test Connection"}
            </Button>
          )}

          <div className="text-sm text-gray-600">
            <p className="mb-2 font-medium">How it works:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Booking data will be automatically exported to your Google Sheets</li>
              <li>Each booking gets one row that updates as the booking changes</li>
              <li>Column headers are created automatically on first use</li>
              <li>Make sure the Google account used for authentication has edit access to the sheet</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventTypeAppSettingsInterface;
