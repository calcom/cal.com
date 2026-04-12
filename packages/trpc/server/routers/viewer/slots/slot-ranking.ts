import dayjs from "@calcom/dayjs";

type SlotEntry = {
  time: string;
  attendees?: number;
  bookingUid?: string;
  [key: string]: unknown;
};

type SlotsByDate = Record<string, SlotEntry[]>;

type RankingHint = {
  score: number;
  reason: "capacity" | "proximity" | "recency";
};

type RankingHintsByDate = Record<string, Record<string, RankingHint>>;

export type SlotRankingResult = {
  slots: SlotsByDate;
  rankingHints?: RankingHintsByDate;
};

export type SlotRankingOptions = {
  preferredHourStart?: number;
  maxSlotsPerDay?: number;
  timeZone?: string;
  includeRankingHints?: boolean;
};

function scoreSlot(slot: SlotEntry, preferredHourStart: number, timeZone: string): RankingHint {
  const slotMoment = dayjs(slot.time).tz(timeZone, true);
  const hourDistance = Math.abs(slotMoment.hour() - preferredHourStart);
  const proximityScore = Math.max(0, 24 - hourDistance);
  const capacityScore = Math.min(slot.attendees ?? 0, 6);
  const recencyScore = Math.max(0, 12 - dayjs().diff(slotMoment, "hour"));
  const score = proximityScore * 4 + capacityScore * 3 + recencyScore;

  let reason: RankingHint["reason"] = "proximity";
  if (capacityScore > proximityScore / 2) {
    reason = "capacity";
  } else if (recencyScore > proximityScore / 3) {
    reason = "recency";
  }

  return { score, reason };
}

export function rankAndLimitSlotsByDay(
  slotsByDate: SlotsByDate,
  options: SlotRankingOptions
): SlotRankingResult {
  const preferredHourStart = options.preferredHourStart ?? 9;
  const maxSlotsPerDay = options.maxSlotsPerDay ?? 8;
  const timeZone = options.timeZone ?? "UTC";
  const includeRankingHints = options.includeRankingHints ?? false;
  const rankingHints: RankingHintsByDate = {};
  const rankedSlots = slotsByDate;

  for (const [date, slots] of Object.entries(rankedSlots)) {
    if (!Array.isArray(slots) || slots.length === 0) {
      continue;
    }

    slots.sort((a, b) => {
      const aHint = scoreSlot(a, preferredHourStart, timeZone);
      const bHint = scoreSlot(b, preferredHourStart, timeZone);
      return bHint.score - aHint.score;
    });

    rankedSlots[date] = slots.slice(0, maxSlotsPerDay);

    if (!includeRankingHints) {
      continue;
    }

    rankingHints[date] = {};
    for (const slot of rankedSlots[date]) {
      rankingHints[date][slot.time] = scoreSlot(slot, preferredHourStart, timeZone);
    }
  }

  return {
    slots: rankedSlots,
    rankingHints: includeRankingHints ? rankingHints : undefined,
  };
}
