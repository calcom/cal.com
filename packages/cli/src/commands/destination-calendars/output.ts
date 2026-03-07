import { type OutputOptions, renderDetail, renderHeader, renderSuccess } from "../../shared/output";
import type { DestinationCalendar, DestinationCalendarsOutputDto } from "./types";

export function renderDestinationCalendar(
  calendar: DestinationCalendar | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(calendar, null, 2));
    return;
  }

  if (!calendar) {
    console.log("No destination calendar configured.");
    return;
  }

  renderHeader("Destination Calendar");
  renderDetail([
    ["Integration:", calendar.integration],
    ["External ID:", calendar.externalId],
    ["Credential:", calendar.credentialId],
    ["Name:", calendar.name],
    ["Email:", calendar.primaryEmail],
  ]);
}

export function renderDestinationCalendarUpdated(
  calendar: DestinationCalendarsOutputDto | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(calendar, null, 2));
    return;
  }

  if (!calendar) {
    console.log("Failed to update destination calendar.");
    return;
  }

  renderSuccess(`Destination calendar updated: ${calendar.integration} (${calendar.externalId})`);
}
