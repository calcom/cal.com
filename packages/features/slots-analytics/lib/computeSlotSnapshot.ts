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

  const firstDate = sortedDates[0];
  const firstDateSlots = slots[firstDate];
  if (!firstDateSlots || firstDateSlots.length === 0) return null;

  const firstSlotTime = firstDateSlots[0].time;
  if (!firstSlotTime) return null;

  const leadTimeMinutes = Math.round((new Date(firstSlotTime).getTime() - Date.now()) / 60000);
  if (leadTimeMinutes < 0) return null;

  return { eventTypeId, firstSlotLeadTime: leadTimeMinutes };
}
