import { formatTime, renderSuccess, renderTable, type OutputOptions } from "../../shared/output";
import type { ReservedSlot, SlotsData } from "./types";

export function renderAvailableSlots(
  data: SlotsData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data || Object.keys(data).length === 0) {
    console.log("No available slots found.");
    return;
  }

  const rows: string[][] = [];
  for (const [date, dateSlots] of Object.entries(data)) {
    if (!Array.isArray(dateSlots)) continue;
    for (const slot of dateSlots) {
      const timeValue = typeof slot === "string" ? slot : slot.start;
      if (timeValue) {
        rows.push([date, formatTime(timeValue)]);
      }
    }
  }

  if (rows.length === 0) {
    console.log("No available slots found.");
    return;
  }

  renderTable(["Date", "Time"], rows);
}

export function renderReservedSlot(data: ReservedSlot | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to reserve slot.");
    return;
  }

  renderSuccess(`Slot reserved: ${data.reservationUid}`);
}

export function renderSlotDeleted(uid: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Slot ${uid} deleted` }));
    return;
  }

  renderSuccess(`Reserved slot ${uid} deleted.`);
}
