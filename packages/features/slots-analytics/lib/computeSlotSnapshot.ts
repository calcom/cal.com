interface SlotData {
  time: string;
  [key: string]: unknown;
}

type SlotsMap = Record<string, SlotData[]>;

export function computeSlotSnapshot(
  slots: SlotsMap,
  eventTypeId: number,
  sampleRate = 0.3
): { eventTypeId: number; firstSlotLeadTime: number } | null {
  if (Math.random() >= sampleRate) return null;

  const sortedDates = Object.keys(slots).sort();
  if (sortedDates.length === 0) return null;

  let firstSlotTime: string | undefined;
  for (const date of sortedDates) {
    const dateSlots = slots[date];
    if (dateSlots && dateSlots.length > 0 && dateSlots[0].time) {
      firstSlotTime = dateSlots[0].time;
      break;
    }
  }

  if (!firstSlotTime) return null;

  const leadTimeMinutes = Math.round((new Date(firstSlotTime).getTime() - Date.now()) / 60000);

  return { eventTypeId, firstSlotLeadTime: Math.max(leadTimeMinutes, 0) };
}
