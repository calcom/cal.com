import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { default as DatePickerComponent } from "@calcom/features/calendars/DatePicker";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import { weekdayToWeekIndex } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";

import { useBookerStore } from "../store";
import type { useScheduleForEventReturnType } from "../utils/event";

export const DatePicker = ({
  event,
  schedule,
  classNames,
  scrollToTimeSlots,
}: {
  event: {
    data?: { subsetOfUsers: Pick<User, "weekStart">[] } | null;
  };
  schedule: useScheduleForEventReturnType;
  classNames?: {
    datePickerContainer?: string;
    datePickerTitle?: string;
    datePickerDays?: string;
    datePickerDate?: string;
    datePickerDatesActive?: string;
    datePickerToggle?: string;
  };
  scrollToTimeSlots?: () => void;
}) => {
  const { i18n } = useLocale();
  const [month, selectedDate] = useBookerStore((state) => [state.month, state.selectedDate], shallow);
  const [setSelectedDate, setMonth, setDayCount] = useBookerStore(
    (state) => [state.setSelectedDate, state.setMonth, state.setDayCount],
    shallow
  );
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots);
  const browsingDate = month ? dayjs(month) : dayjs().startOf("month");

  const onMonthChange = (date: Dayjs) => {
    setMonth(date.format("YYYY-MM"));
    setSelectedDate(date.format("YYYY-MM-DD"));
    setDayCount(null); // Whenever the month is changed, we nullify getting X days
  };

  const moveToNextMonthOnNoAvailability = () => {
    const currentMonth = dayjs().startOf("month").format("YYYY-MM");
    const browsingMonth = browsingDate.format("YYYY-MM");

    // Insufficient data case
    if (!schedule?.data?.slots) {
      return;
    }

    // Not meeting the criteria to move to next month
    // Has to be currentMonth and it must have all days unbookable
    if (currentMonth != browsingMonth || nonEmptyScheduleDays.length) {
      return;
    }

    onMonthChange(browsingDate.add(1, "month"));
  };

  moveToNextMonthOnNoAvailability();

  return (
    <DatePickerComponent
      customClassNames={{
        datePickerTitle: classNames?.datePickerTitle,
        datePickerDays: classNames?.datePickerDays,
        datePickersDates: classNames?.datePickerDate,
        datePickerDatesActive: classNames?.datePickerDatesActive,
        datePickerToggle: classNames?.datePickerToggle,
      }}
      className={classNames?.datePickerContainer}
      isPending={schedule.isPending}
      onChange={(date: Dayjs | null, omitUpdatingParams?: boolean) => {
        setSelectedDate(date === null ? date : date.format("YYYY-MM-DD"), omitUpdatingParams);
      }}
      onMonthChange={onMonthChange}
      includedDates={nonEmptyScheduleDays}
      locale={i18n.language}
      browsingDate={month ? dayjs(month) : undefined}
      selected={dayjs(selectedDate)}
      weekStart={weekdayToWeekIndex(event?.data?.subsetOfUsers?.[0]?.weekStart)}
      slots={schedule?.data?.slots}
      scrollToTimeSlots={scrollToTimeSlots}
    />
  );
};
