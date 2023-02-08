import dayjs from "@calcom/dayjs";
import { AvailableTimes } from "@calcom/features/bookings";
import { useSchedule, useSlotsForDate } from "@calcom/features/schedules";
import { classNames } from "@calcom/lib";

import { useBookerStore } from "../store";
import { useTimePrerences } from "../utils/time";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  onTimeSelect: (time: string) => void;
  limitHeight?: boolean;
};

export const AvailableTimeSlots = ({ extraDays, onTimeSelect, limitHeight }: AvailableTimeSlotsProps) => {
  const [selectedDate, username, eventSlug, eventId, month] = useBookerStore((state) => [
    state.selectedDate,
    state.username,
    state.eventSlug,
    state.eventId,
    state.month,
  ]);
  const { timezone } = useTimePrerences();
  const schedule = useSchedule({
    username,
    eventSlug,
    eventId,
    browsingMonth: month,
    timezone,
    // @TODO: Fix types
  } as { username: string; eventSlug: string; browsingMonth: Date; timezone: string });

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
    <div className={classNames(limitHeight && "flex-grow md:h-[400px]", !limitHeight && "[&_header]:top-8")}>
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
