import chalk from "chalk";
import { type OutputOptions, renderSuccess } from "../../shared/output";
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

  console.log(chalk.bold("\nDestination Calendar"));
  console.log(`  Integration:  ${calendar.integration}`);
  console.log(`  External ID:  ${calendar.externalId}`);
  if (calendar.credentialId) console.log(`  Credential:   ${calendar.credentialId}`);
  if (calendar.name) console.log(`  Name:         ${calendar.name}`);
  if (calendar.primaryEmail) console.log(`  Email:        ${calendar.primaryEmail}`);
  console.log();
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
