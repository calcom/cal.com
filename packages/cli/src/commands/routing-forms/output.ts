import { type OutputOptions, renderHeader } from "../../shared/output";
import type { RoutingFormSlotsData } from "./types";

export function renderRoutingFormSlots(
  data: RoutingFormSlotsData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  renderHeader("Available Slots");
  if (!data) {
    console.log("No slots data returned.");
    return;
  }
  console.log(`Event Type ID: ${data.eventTypeId}`);
  console.log(JSON.stringify(data.slots, null, 2));
}
