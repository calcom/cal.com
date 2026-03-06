import { type OutputOptions, renderTable } from "../../shared/output";
import type { TimezonesData } from "./types";

export function renderTimezones(data: TimezonesData | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data || data.length === 0) {
    console.log("No timezones returned.");
    return;
  }

  renderTable(
    ["City", "Timezone"],
    data.map((tz) => [tz.city, tz.timezone])
  );
}
