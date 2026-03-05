import { renderTable } from "../../shared/output";
import type { Profile } from "./types";

interface OutputOptions {
  json?: boolean;
}

function formatDefaultSchedule(id: number | null | undefined): string {
  if (id) {
    return String(id);
  }
  return "None";
}

export function renderProfile(profile: Profile | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(profile, null, 2));
    return;
  }

  if (!profile) {
    console.log("No profile data returned.");
    return;
  }

  renderTable(
    ["Field", "Value"],
    [
      ["ID", String(profile.id)],
      ["Username", profile.username || ""],
      ["Name", profile.name || ""],
      ["Email", profile.email || ""],
      ["Timezone", profile.timeZone || ""],
      ["Week Start", profile.weekStart || ""],
      ["Default Schedule", formatDefaultSchedule(profile.defaultScheduleId)],
    ]
  );
}
