import { Dayjs } from "@calcom/dayjs";

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
      for (; slotStart.isBefore(end); slotStart = slotStart.add(frequency, "minutes")) {
        if (!slotStart.add(eventLength, "minutes").isBefore(end)) {
          // skip adding slot, it's not within the availability block.
          continue;
        }
        slots.push({
          time: slotStart,
        });
      }
      return slots;
    },
  };
};

export type GetSlots = {
  availability: { start: Dayjs; end: Dayjs }[];
} & Parameters<typeof slotExtractor>[0];

const getSlots = ({ availability, ...slotExtractorProps }: GetSlots) => {
  const { extract } = slotExtractor(slotExtractorProps);
  return availability.reduce((slots, block) => {
    return slots.concat(extract(block));
  }, [] as Slots);
};

export default getSlots;
