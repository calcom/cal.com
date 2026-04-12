import dayjs from "@calcom/dayjs";

type SlotEntry = {
  time: string;
  [key: string]: unknown;
};

type RankingHint = {
  score: number;
  reason: "capacity" | "proximity" | "recency";
};

type RankingHints = Record<string, RankingHint> | undefined;

export const applyClientSideRanking = (
  daySlots: SlotEntry[],
  rankingHints: RankingHints,
  timezone: string
): SlotEntry[] => {
  const slots = [...daySlots];
  const now = dayjs();

  slots.sort((a, b) => {
    const hintA = rankingHints?.[a.time]?.score ?? 0;
    const hintB = rankingHints?.[b.time]?.score ?? 0;
    if (hintA !== hintB) {
      return hintB - hintA;
    }

    const distanceFromNowA = Math.abs(now.diff(dayjs(a.time).tz(timezone, true), "minute"));
    const distanceFromNowB = Math.abs(now.diff(dayjs(b.time).tz(timezone, true), "minute"));
    return distanceFromNowA - distanceFromNowB;
  });

  return slots;
};
