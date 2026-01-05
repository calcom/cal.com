import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { DatePickerClassNames } from "@calcom/features/bookings/Booker/types";
import { DatePicker as DatePickerComponent } from "@calcom/features/calendars/DatePicker";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules/lib/use-schedule/useNonEmptyScheduleDays";
import { weekdayToWeekIndex } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import type { PeriodData } from "@calcom/types/Event";

import type { Slots } from "../../types";

const useMoveToNextMonthOnNoAvailability = ({
  browsingDate,
  nonEmptyScheduleDays,
  onMonthChange,
  isLoading,
  periodData,
}: {
  browsingDate: Dayjs;
  nonEmptyScheduleDays: string[];
  isLoading: boolean;
  onMonthChange: (date: Dayjs) => void;
  periodData?: PeriodData;
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


    if (periodData?.periodType === "ROLLING" && periodData.periodDays) {
      const today = dayjs();
      const daysToAdd = Math.max(0, periodData.periodDays - 1);
      const maxBookableDate = periodData.periodCountCalendarDays
        ? today.add(daysToAdd, "day")
        : today.businessDaysAdd(daysToAdd);
      const nextMonthStart = browsingDate.add(1, "month").startOf("month");

      if (nextMonthStart.isAfter(maxBookableDate, "day")) {
        return;
      }
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
  showNoAvailabilityDialog,
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
  classNames?: DatePickerClassNames;
  scrollToTimeSlots?: () => void;
  showNoAvailabilityDialog?: boolean;
}) => {
  const { i18n } = useLocale();
  const [month, selectedDate, layout] = useBookerStoreContext(
    (state) => [state.month, state.selectedDate, state.layout],
    shallow
  );

  const [setSelectedDate, setMonth, setDayCount] = useBookerStoreContext(
    (state) => [state.setSelectedDate, state.setMonth, state.setDayCount],
    shallow
  );

  const onMonthChange = (date: Dayjs) => {
    setMonth(date.format("YYYY-MM"));
    setSelectedDate({ date: date.format("YYYY-MM-DD") });
    setDayCount(null); // Whenever the month is changed, we nullify getting X days
  };

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(slots);
  const browsingDate = month ? dayjs(month) : dayjs().startOf("month");

  // Determine if this is a compact sidebar view based on layout
  const isCompact = layout !== "month_view" && layout !== "mobile";

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

  const { moveToNextMonthOnNoAvailability } = useMoveToNextMonthOnNoAvailability({
    browsingDate,
    nonEmptyScheduleDays,
    onMonthChange,
    isLoading: isLoading ?? true,
    periodData,
  });
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
      isLoading={isLoading}
      onChange={(date: Dayjs | null, omitUpdatingParams?: boolean) => {
        setSelectedDate({
          date: date === null ? date : date.format("YYYY-MM-DD"),
          omitUpdatingParams,
          preventMonthSwitching: !isCompact, // Prevent month switching when in monthly view
        });
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
      isCompact={isCompact}
      showNoAvailabilityDialog={showNoAvailabilityDialog}
    />
  );
};
