import type { Dayjs } from "@calcom/dayjs";

const minimumOfOne = (input: number) => (input < 1 ? 1 : input);

type Slots = {
  time: Dayjs;
}[];

const slotExtractor = ({ eventLength, frequency }: { eventLength: number; frequency: number }) => {
  eventLength = minimumOfOne(eventLength);
  frequency = minimumOfOne(frequency);
  return {
    extract: ({ start: slotStart, end }: { start: Dayjs; end: Dayjs }) => {
      const slots: Slots = [];
      for (
        ;
        // isSameOrBefore
        !slotStart.add(eventLength, "minutes").isAfter(end);
        slotStart = slotStart.add(frequency, "minutes")
      ) {
        slots.push({
          time: slotStart,
        });
      }
      return slots;
    },
  };
};

export type GetSlots = {
  userAvailabilities: {
    userId?: number;
    timeZone: string;
    availability: {
      start: Dayjs;
      end: Dayjs;
    }[];
  }[];
} & Parameters<typeof slotExtractor>[0];

const getSlots = ({ userAvailabilities, ...slotExtractorProps }: GetSlots) => {
  const { extract } = slotExtractor(slotExtractorProps);

  const slotsGroupedByTime = userAvailabilities.reduce((slots, userAvailability) => {
    const newSlots = userAvailability.availability
      .map((block) => extract(block))
      .flat()
      .map((block) => ({
        ...block,
        userIds: userAvailability.userId ? [userAvailability.userId] : [],
      }));

    newSlots.forEach((slot) => {
      slots[slot.time.format()] = slots[slot.time.format()]
        ? {
            time: slot.time,
            userIds: userAvailability.userId
              ? slots[slot.time.format()].userIds.concat(userAvailability.userId)
              : slot.userIds,
          }
        : slot;
    });

    return slots;
  }, {} as { [x: string]: { time: Dayjs; userIds: number[] } });

  return Object.values(slotsGroupedByTime);
};

export default getSlots;
