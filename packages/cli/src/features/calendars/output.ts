import chalk from "chalk";
import { formatDateTime, renderTable, type OutputOptions } from "../../shared/output";
import type { BusyTimesList, ConnectedCalendarsData } from "./types";

function formatSelectedLabel(isSelected: boolean): string {
  if (isSelected) {
    return chalk.green("[selected]");
  }
  return "";
}

function formatCalendarFlags(readOnly: boolean, isSelected: boolean): string {
  const parts: string[] = [];
  if (readOnly) {
    parts.push("read-only");
  }
  if (isSelected) {
    parts.push(chalk.green("selected"));
  }
  const flags = parts.join(", ");
  if (flags) {
    return `[${flags}]`;
  }
  return "";
}

export function renderCalendarList(
  data: ConnectedCalendarsData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data?.connectedCalendars, null, 2));
    return;
  }

  const calendars = data?.connectedCalendars;

  if (!calendars || calendars.length === 0) {
    console.log("No connected calendars.");
    return;
  }

  for (const cal of calendars) {
    const title = cal.integration?.name || cal.integration?.type || "Unknown";
    console.log(chalk.bold(`\n${title} (Credential: ${cal.credentialId})`));

    if (cal.primary) {
      const selectedLabel = formatSelectedLabel(cal.primary.isSelected);
      console.log(`  Primary: ${cal.primary.name || ""} (${cal.primary.externalId}) ${selectedLabel}`);
    }

    if (cal.calendars?.length) {
      for (const sub of cal.calendars) {
        const flags = formatCalendarFlags(sub.readOnly, sub.isSelected);
        console.log(`  - ${sub.name || ""} (${sub.externalId}) ${flags}`);
      }
    }
  }

  console.log();
}

export function renderBusyTimes(data: BusyTimesList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data || data.length === 0) {
    console.log("No busy times found.");
    return;
  }

  renderTable(
    ["Start", "End", "Source"],
    data.map((bt) => [formatDateTime(bt.start), formatDateTime(bt.end), bt.source || ""])
  );
}
