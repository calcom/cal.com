import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { DatePicker as DatePickerComponent } from "@calcom/features/calendars/DatePicker";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import { weekdayToWeekIndex } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import type { PeriodData } from "@calcom/types/Event";

import type { Slots } from "../../types";
import { useBookerStore } from "../store";

const useMoveToNextMonthOnNoAvailability = ({
  browsingDate,
  nonEmptyScheduleDays,
  onMonthChange,
  isLoading,
}: {
  browsingDate: Dayjs;
  nonEmptyScheduleDays: string[];
  isLoading: boolean;
  onMonthChange: (date: Dayjs) => void;
}) => {
  if (isLoading) {
    return {
      moveToNextMonthOnNoAvailability: () => {
        /* return noop until ready */
      },
    };
  }

  const nonEmptyScheduleDaysInBrowsingMonth = nonEmptyScheduleDays.filter((date) =>
    dayjs(date).isSame(browsingDate, "month")
  );

  const moveToNextMonthOnNoAvailability = () => {
    const currentMonth = dayjs().startOf("month").format("YYYY-MM");
    const browsingMonth = browsingDate.format("YYYY-MM");
    // Not meeting the criteria to move to next month
    // Has to be currentMonth and it must have all days unbookable
    if (currentMonth != browsingMonth || nonEmptyScheduleDaysInBrowsingMonth.length) {
      return;
    }
    onMonthChange(browsingDate.add(1, "month"));
  };
  return {
    moveToNextMonthOnNoAvailability,
  };
};

export const DatePicker = ({
  event,
  slots = {},
  isLoading,
  classNames,
  scrollToTimeSlots,
}: {
  event: {
    data?: {
      subsetOfUsers: Pick<User, "weekStart">[];
      periodType?: PeriodData["periodType"];
      periodStartDate?: PeriodData["periodStartDate"];
      periodEndDate?: PeriodData["periodEndDate"];
      periodDays?: PeriodData["periodDays"];
      periodCountCalendarDays?: PeriodData["periodCountCalendarDays"];
    } | null;
  };
  slots?: Slots;
  isLoading?: boolean;
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

  const onMonthChange = (date: Dayjs) => {
    setMonth(date.format("YYYY-MM"));
    setSelectedDate(date.format("YYYY-MM-DD"));
    setDayCount(null); // Whenever the month is changed, we nullify getting X days
  };

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(slots);
  const browsingDate = month ? dayjs(month) : dayjs().startOf("month");

  const { moveToNextMonthOnNoAvailability } = useMoveToNextMonthOnNoAvailability({
    browsingDate,
    nonEmptyScheduleDays,
    onMonthChange,
    isLoading: isLoading ?? true,
  });
  moveToNextMonthOnNoAvailability();

  const periodData: PeriodData = {
    ...{
      periodType: "UNLIMITED",
      periodStartDate: null,
      periodEndDate: null,
      periodDays: null,
      periodCountCalendarDays: false,
    },
    ...(event?.data && {
      periodType: event.data.periodType,
      periodStartDate: event.data.periodStartDate,
      periodEndDate: event.data.periodEndDate,
      periodDays: event.data.periodDays,
      periodCountCalendarDays: event.data.periodCountCalendarDays,
    }),
  };
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
      isLoading={isLoading}
      onChange={(date: Dayjs | null, omitUpdatingParams?: boolean) => {
        setSelectedDate(date === null ? date : date.format("YYYY-MM-DD"), omitUpdatingParams);
      }}
      onMonthChange={onMonthChange}
      includedDates={nonEmptyScheduleDays}
      locale={i18n.language}
      browsingDate={month ? dayjs(month) : undefined}
      selected={dayjs(selectedDate)}
      weekStart={weekdayToWeekIndex(event?.data?.subsetOfUsers?.[0]?.weekStart)}
      slots={slots}
      scrollToTimeSlots={scrollToTimeSlots}
      periodData={periodData}
    />
  );
};
