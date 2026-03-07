import chalk from "chalk";
import {
  formatDateTime,
  type OutputOptions,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
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
    renderHeader(`${title} (Credential: ${cal.credentialId})`);

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

export function renderCalendarRedirect(data: unknown, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const response = data as { authUrl?: string } | undefined;
  if (!response?.authUrl) {
    console.log("No redirect URL returned.");
    return;
  }
  renderHeader("Calendar OAuth");
  console.log(`Visit this URL to connect your calendar:\n`);
  console.log(chalk.cyan(response.authUrl));
}

export function renderCalendarSaved(data: unknown, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  renderSuccess("Calendar credentials saved successfully.");
}

export function renderCalendarCheck(data: unknown, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  renderHeader("Calendar Status");
  console.log("Calendar check complete. See JSON output for details.");
}

export function renderCredentialsSynced(data: unknown, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  renderSuccess("Calendar credentials synced successfully.");
}

export function renderCalendarCredentialsDeleted(data: unknown, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  renderSuccess("Calendar credentials deleted successfully.");
}

export function renderIcsFeedCheck(data: unknown, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const response = data as { status: string; isValid?: boolean } | undefined;
  if (response?.isValid) {
    renderSuccess("ICS feed URL is valid.");
  } else {
    console.log("ICS feed URL is invalid or unreachable.");
  }
}

export function renderIcsFeedCreated(data: unknown, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const response = data as { data?: { id?: number; externalId?: string } } | undefined;
  if (response?.data) {
    renderSuccess(`ICS feed calendar created successfully.`);
    if (response.data.id) {
      console.log(`  Calendar ID: ${response.data.id}`);
    }
    if (response.data.externalId) {
      console.log(`  External ID: ${response.data.externalId}`);
    }
  } else {
    renderSuccess("ICS feed calendar created.");
  }
}
