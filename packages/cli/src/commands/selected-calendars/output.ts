import { type OutputOptions, renderSuccess, renderTable } from "../../shared/output";
import type { SelectedCalendar } from "./types";

export function renderSelectedCalendarList(
  calendars: SelectedCalendar[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(calendars, null, 2));
    return;
  }

  if (!calendars || calendars.length === 0) {
    console.log("No selected calendars.");
    return;
  }

  renderTable(
    ["Integration", "External ID", "Credential ID"],
    calendars.map((c) => [c.integration, c.externalId, String(c.credentialId ?? "")])
  );
}

export function renderSelectedCalendarAdded(
  calendar: SelectedCalendar | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(calendar, null, 2));
    return;
  }

  if (!calendar) {
    console.log("Failed to add selected calendar.");
    return;
  }

  renderSuccess("Selected calendar added.");
}

export function renderSelectedCalendarRemoved({ json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: "Selected calendar removed" }));
    return;
  }

  renderSuccess("Selected calendar removed.");
}
