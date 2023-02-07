import dayjs from "@calcom/dayjs";
import { AvailableTimes } from "@calcom/features/bookings";
import { useSchedule, useSlotsForDate } from "@calcom/features/schedules";

import { useBookerStore } from "../store";
import { useTimePrerences } from "../utils/time";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  onTimeSelect: (time: string) => void;
};

export const AvailableTimeSlots = ({ extraDays, onTimeSelect }: AvailableTimeSlotsProps) => {
  const [selectedDate, username, eventSlug, month] = useBookerStore((state) => [
    state.selectedDate,
    state.username,
    state.eventSlug,
    state.month,
  ]);
  const { timezone } = useTimePrerences();
  const schedule = useSchedule({
    username,
    eventSlug,
    browsingMonth: month,
    timezone,
  });

  const slots = useSlotsForDate(
    // typeof dayOffset === "undefined"
    selectedDate,
    // : dayjs(selectedDate).add(dayOffset, "days").format("YYYY-MM-DD"),
    schedule?.data?.slots
  );

  /* @TODO: Weekstart day */
  /* @TODO: recurring event count */
  /* @TODO: eth signature */
  /* @TODO: seats per timeslot */
  return (
    <div className="flex-grow md:h-[400px]">
      {slots.length > 0 && selectedDate && (
        <AvailableTimes
          onTimeSelect={onTimeSelect}
          date={dayjs(selectedDate)}
          slots={slots}
          timezone={timezone}
        />
      )}
    </div>
  );
};
