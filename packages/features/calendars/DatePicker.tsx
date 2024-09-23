import { useEffect, useMemo, useCallback } from "react";
import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useEmbedStyles } from "@calcom/embed-core/embed-iframe";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { getAvailableDatesInMonth } from "@calcom/features/calendars/lib/getAvailableDatesInMonth";
import classNames from "@calcom/lib/classNames";
import { daysInMonth, yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import { Button, SkeletonText } from "@calcom/ui";
import { ChevronLeft, ChevronRight } from "@calcom/ui/components/icon";
import { ArrowRight } from "@calcom/ui/components/icon";

interface DayObject {
  day: null | Dayjs;
  disabled: boolean;
}

interface UseCalendarDaysProps {
  browsingDate: Dayjs;
  weekStart: number;
  minDate?: Date;
  includedDates?: string[];
  excludedDates?: string[];
}

export const useCalendarDays = ({
  browsingDate,
  weekStart,
  minDate,
  includedDates = [],
  excludedDates = [],
}: UseCalendarDaysProps) => {
  // Create placeholder elements for empty days in first week
  const weekdayOfFirst = browsingDate.date(1).day();

  // Get available dates in the month
  const includedDatesInMonth = getAvailableDatesInMonth({
    browsingDate: browsingDate.toDate(),
    minDate,
    includedDates,
  });

  // Get available dates in the month
  const includedDatesNextMonth = getAvailableDatesInMonth({
    browsingDate: browsingDate.add(1, "month").toDate(),
    minDate,
    includedDates,
  });

  // Prepare days for the current month
  const days: (Dayjs | null)[] = Array((weekdayOfFirst - weekStart + 7) % 7).fill(null);
  for (let day = 1, dayCount = daysInMonth(browsingDate); day <= dayCount; day++) {
    const date = browsingDate.set("date", day);
    days.push(date);
  }

  // Prepare days for the next month
  const nextMonthDays: (Dayjs | null)[] = Array((weekdayOfFirst - weekStart + 7) % 7).fill(null);
  for (let day = 1, dayCount = daysInMonth(browsingDate.add(1, "month")); day <= dayCount; day++) {
    const date = browsingDate.add(1, "month").set("date", day);
    nextMonthDays.push(date);
  }

  const daysToRenderForTheMonth = useMemo(
    () =>
      days.map((day) => {
        if (!day) return { day: null, disabled: true };
        return {
          day,
          disabled:
            (includedDatesInMonth && !includedDatesInMonth.includes(yyyymmdd(day))) ||
            excludedDates.includes(yyyymmdd(day)),
        };
      }),
    [days, includedDatesInMonth, excludedDates]
  );

  const daysToRenderForNextMonth = useMemo(
    () =>
      nextMonthDays.map((day) => {
        if (!day) return { day: null, disabled: true };
        return {
          day,
          disabled: !(includedDates || []).includes(yyyymmdd(day)),
        };
      }),
    [nextMonthDays, includedDates]
  );

  // Check if next month should be rendered based on available days in the current month
  const availableDaysForTheMonth = daysToRenderForTheMonth.filter((day) => !day.disabled);
  const shouldRenderNextMonth =
    includedDatesInMonth.length > 0 &&
    availableDaysForTheMonth.length <= 7 &&
    includedDatesNextMonth.length > 0;

  // Combine days from the current month and next month (if needed)
  const allDays = useMemo(() => {
    if (shouldRenderNextMonth) {
      return [...daysToRenderForTheMonth, ...daysToRenderForNextMonth];
    }
    return daysToRenderForTheMonth;
  }, [shouldRenderNextMonth, daysToRenderForTheMonth, daysToRenderForNextMonth]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const daysPerWeek = 7;
    const groupedWeeks: DayObject[][] = [];

    for (let i = 0; i < allDays.length; i += daysPerWeek) {
      groupedWeeks.push(allDays.slice(i, i + daysPerWeek));
    }

    if (includedDatesInMonth.length === 0) {
      return groupedWeeks.slice(0, 5);
    }

    // Helper to check if a week has available days
    const hasAvailableDays = (week: DayObject[]) => week.some((day) => day && !day.disabled);

    // Find the first and last available week index
    const firstAvailableIndex = groupedWeeks.findIndex(hasAvailableDays);
    const lastAvailableIndex = groupedWeeks.slice().reverse().findIndex(hasAvailableDays);
    const adjustedLastAvailableIndex =
      lastAvailableIndex === -1 ? -1 : groupedWeeks.length - 1 - lastAvailableIndex;

    // Retain weeks between the first and last available week (inclusive)
    const boundedWeeks: DayObject[][] = [];
    if (firstAvailableIndex !== -1 && adjustedLastAvailableIndex !== -1) {
      for (let i = firstAvailableIndex; i <= adjustedLastAvailableIndex; i++) {
        boundedWeeks.push(groupedWeeks[i]);
      }
    }

    // Limit the result to a maximum of 5 weeks
    return boundedWeeks.slice(0, 5);
  }, [allDays, includedDatesInMonth]);

  return {
    daysToRenderForTheMonth,
    daysToRenderForNextMonth,
    shouldRenderNextMonth,
    includedDatesInMonth,
    includedDatesNextMonth,
    weeks,
  };
};

export type DatePickerProps = {
  /** which day of the week to render the calendar. Usually Sunday (=0) or Monday (=1) - default: Sunday */
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Fires whenever a selected date is changed. */
  onChange: (date: Dayjs | null) => void;
  /** Fires when the month is changed. */
  onMonthChange?: (date: Dayjs) => void;
  /** which date or dates are currently selected (not tracked from here) */
  selected?: Dayjs | Dayjs[] | null;
  /** defaults to current date. */
  minDate?: Date;
  /** Furthest date selectable in the future, default = UNLIMITED */
  maxDate?: Date;
  /** locale, any IETF language tag, e.g. "hu-HU" - defaults to Browser settings */
  locale: string;
  /** Defaults to [], which dates are not bookable. Array of valid dates like: ["2022-04-23", "2022-04-24"] */
  excludedDates?: string[];
  /** defaults to all, which dates are bookable (inverse of excludedDates) */
  includedDates?: string[];
  /** allows adding classes to the container */
  className?: string;
  /** Shows a small loading spinner next to the month name */
  isPending?: boolean;
  /** used to query the multiple selected dates */
  eventSlug?: string;
};

export const Day = ({
  date,
  active,
  disabled,
  ...props
}: JSX.IntrinsicElements["button"] & {
  active: boolean;
  date: Dayjs;
}) => {
  const { t } = useLocale();
  const enabledDateButtonEmbedStyles = useEmbedStyles("enabledDateButton");
  const disabledDateButtonEmbedStyles = useEmbedStyles("disabledDateButton");
  return (
    <button
      type="button"
      style={disabled ? { ...disabledDateButtonEmbedStyles } : { ...enabledDateButtonEmbedStyles }}
      className={classNames(
        "disabled:text-bookinglighter absolute bottom-0 left-0 right-0 top-0 mx-auto w-full rounded-md border-2 border-transparent text-center text-sm font-medium disabled:cursor-default disabled:border-transparent disabled:font-light ",
        active
          ? "bg-brand-default text-brand"
          : !disabled
          ? " hover:border-brand-default text-emphasis bg-emphasis"
          : "text-muted"
      )}
      data-testid="day"
      data-disabled={disabled}
      disabled={disabled}
      {...props}>
      {date.date()}
      {date.isToday() && (
        <span
          className={classNames(
            "bg-brand-default absolute left-1/2 top-1/2 flex h-[5px] w-[5px] -translate-x-1/2 translate-y-[8px] items-center justify-center rounded-full align-middle sm:translate-y-[12px]",
            active && "bg-brand-accent"
          )}>
          <span className="sr-only">{t("today")}</span>
        </span>
      )}
    </button>
  );
};

const NoAvailabilityOverlay = ({
  month,
  nextMonthButton,
}: {
  month: string | null;
  nextMonthButton: () => void;
}) => {
  const { t } = useLocale();

  return (
    <div className="bg-muted border-subtle absolute left-1/2 top-40 -mt-10 w-max -translate-x-1/2 -translate-y-1/2 transform rounded-md border p-8 shadow-sm">
      <h4 className="text-emphasis mb-4 font-medium">{t("no_availability_in_month", { month: month })}</h4>
      <Button onClick={nextMonthButton} color="primary" EndIcon={ArrowRight} data-testid="view_next_month">
        {t("view_next_month")}
      </Button>
    </div>
  );
};

const Days = ({
  minDate,
  excludedDates = [],
  browsingDate,
  weekStart,
  DayComponent = Day,
  selected,
  month,
  nextMonthButton,
  eventSlug,
  ...props
}: Omit<DatePickerProps, "locale" | "className" | "weekStart"> & {
  DayComponent?: React.FC<React.ComponentProps<typeof Day>>;
  browsingDate: Dayjs;
  weekStart: number;
  month: string | null;
  nextMonthButton: () => void;
}) => {
  const { daysToRenderForTheMonth, weeks, includedDatesInMonth, shouldRenderNextMonth } = useCalendarDays({
    browsingDate,
    weekStart,
    minDate,
    excludedDates,
    includedDates: props.includedDates,
  });

  const [selectedDatesAndTimes] = useBookerStore((state) => [state.selectedDatesAndTimes], shallow);

  const isActive = (day: dayjs.Dayjs) => {
    // for selecting a range of dates
    if (Array.isArray(selected)) {
      return Array.isArray(selected) && selected?.some((e) => yyyymmdd(e) === yyyymmdd(day));
    }

    if (selected && yyyymmdd(selected) === yyyymmdd(day)) {
      return true;
    }

    // for selecting multiple dates for an event
    if (
      eventSlug &&
      selectedDatesAndTimes &&
      selectedDatesAndTimes[eventSlug as string] &&
      Object.keys(selectedDatesAndTimes[eventSlug as string]).length > 0
    ) {
      return Object.keys(selectedDatesAndTimes[eventSlug as string]).some((date) => {
        return yyyymmdd(dayjs(date)) === yyyymmdd(day);
      });
    }

    return false;
  };

  /**
   * Takes care of selecting a valid date in the month if the selected date is not available in the month
   */

  const useHandleInitialDateSelection = () => {
    // Let's not do something for now in case of multiple selected dates as behaviour is unclear and it's not needed at the moment
    if (selected instanceof Array) {
      return;
    }
    const firstAvailableDateOfTheMonth = daysToRenderForTheMonth.find((day) => !day.disabled)?.day;

    const isSelectedDateAvailable = selected
      ? daysToRenderForTheMonth.some(({ day, disabled }) => {
          if (day && yyyymmdd(day) === yyyymmdd(selected) && !disabled) return true;
        })
      : false;

    if (!isSelectedDateAvailable && firstAvailableDateOfTheMonth) {
      // If selected date not available in the month, select the first available date of the month
      props.onChange(firstAvailableDateOfTheMonth);
    }

    if (!firstAvailableDateOfTheMonth) {
      props.onChange(null);
    }
  };

  useEffect(useHandleInitialDateSelection);

  return (
    <>
      {weeks.map((week, weekIndex) => {
        // Find the index where the transition between months occurs
        const transitionIndex = week.findIndex(({ day }) => day?.date() === 1);
        // Check if this week contains the transition from current month to next month
        const isTransitionRow = transitionIndex !== -1;
        return (
          <div key={`row-${weekIndex}`} className="relative contents">
            {week.map(({ day, disabled }, idx) => {
              return (
                <div
                  key={day === null ? `e-${idx}` : `day-${day.format()}`}
                  className="relative w-full pt-[100%]">
                  {day === null ? (
                    <div key={`e-${idx}`} />
                  ) : props.isPending ? (
                    <button
                      className="bg-muted text-muted absolute bottom-0 left-0 right-0 top-0 mx-auto flex w-full items-center justify-center rounded-sm border-transparent text-center font-medium opacity-50"
                      key={`e-${idx}`}
                      disabled>
                      <SkeletonText className="h-4 w-5" />
                    </button>
                  ) : (
                    <DayComponent
                      date={day}
                      onClick={() => {
                        props.onChange(day);
                      }}
                      disabled={disabled}
                      active={isActive(day)}
                    />
                  )}

                  {/* Render a continuous separator line for the transition row */}
                  {isTransitionRow && shouldRenderNextMonth && (
                    <>
                      {idx === transitionIndex && (
                        <>
                          <div className="absolute left-[-3px] right-[-3px] top-[-3px] h-[2px] bg-gray-300" />
                          <div className="absolute left-[-3px] top-[-1px] h-[104%] w-[2px] bg-gray-300" />
                        </>
                      )}
                      {idx < transitionIndex && (
                        <div className="relative">
                          <div className="absolute bottom-[-3px] left-[-3px] right-[-3px] h-[2px] bg-gray-300" />
                          {idx === 0 && (
                            <div className="text-white-700 absolute left-[-3px] top-[2px] text-xs">
                              {browsingDate.add(1, "month").format("MMMM")}
                            </div>
                          )}
                        </div>
                      )}
                      {idx > transitionIndex && (
                        <>
                          <div className="absolute left-[-3px] right-[-3px] top-[-3px] h-[2px] bg-gray-300" />
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {!props.isPending && includedDatesInMonth && includedDatesInMonth?.length === 0 && (
        <NoAvailabilityOverlay month={month} nextMonthButton={nextMonthButton} />
      )}
    </>
  );
};

const DatePicker = ({
  weekStart = 0,
  className,
  locale,
  selected,
  onMonthChange,
  ...passThroughProps
}: DatePickerProps & Partial<React.ComponentProps<typeof Days>>) => {
  const browsingDate = passThroughProps.browsingDate || dayjs().startOf("month");
  const nextMonthBrowsingDate = browsingDate.add(1, "month");
  const { i18n } = useLocale();

  const { shouldRenderNextMonth, includedDatesInMonth, includedDatesNextMonth } = useCalendarDays({
    browsingDate,
    weekStart,
    minDate: passThroughProps.minDate,
    excludedDates: passThroughProps.excludedDates,
    includedDates: passThroughProps.includedDates,
  });

  const changeMonth = useCallback(
    (newMonth: number) => {
      if (onMonthChange) {
        onMonthChange(browsingDate.add(newMonth, "month"));
      }
    },
    [browsingDate, onMonthChange]
  );
  const month = browsingDate
    ? new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(
        new Date(browsingDate.year(), browsingDate.month())
      )
    : null;

  const nextMonth = new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(
    new Date(nextMonthBrowsingDate.year(), nextMonthBrowsingDate.month())
  );

  const hasSameYear = browsingDate.format("YYYY") === nextMonthBrowsingDate.format("YYYY");
  const monthText = useMemo(() => {
    if (shouldRenderNextMonth) {
      if (hasSameYear) {
        return (
          <>
            <strong className="text-emphasis font-semibold">
              {month} / {nextMonth}
            </strong>{" "}
            <span className="text-subtle font-medium">{browsingDate.format("YYYY")}</span>
          </>
        );
      }
      return (
        <div className="flex">
          <strong className="text-emphasis mr-1 font-semibold">{month}</strong>
          <span className="text-subtle font-medium">{browsingDate.format("YYYY")}</span>
          <strong className="text-emphasis mx-1 font-semibold">/</strong>
          <strong className="text-emphasis  mr-1 font-semibold">{nextMonth}</strong>
          <span className="text-subtle font-medium">{nextMonthBrowsingDate.format("YYYY")}</span>
        </div>
      );
    }
    return (
      <>
        <strong className="text-emphasis font-semibold">{month}</strong>{" "}
        <span className="text-subtle font-medium">{browsingDate.format("YYYY")}</span>
      </>
    );
  }, [browsingDate, hasSameYear, month, nextMonth, nextMonthBrowsingDate, shouldRenderNextMonth]);

  useEffect(() => {
    if (includedDatesInMonth?.length === 0 && includedDatesNextMonth?.length > 0) {
      changeMonth(+1);
    }
  }, [changeMonth, includedDatesInMonth?.length, includedDatesNextMonth?.length]);

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xl">
        <div className="text-default text-base">
          {browsingDate ? monthText : <SkeletonText className="h-8 w-24" />}
        </div>
        <div className="text-emphasis">
          <div className="flex">
            <Button
              className={classNames(
                "group p-1 opacity-70 hover:opacity-100 rtl:rotate-180",
                !browsingDate.isAfter(dayjs()) &&
                  "disabled:text-bookinglighter hover:bg-background hover:opacity-70"
              )}
              onClick={() => changeMonth(-1)}
              disabled={!browsingDate.isAfter(dayjs())}
              data-testid="decrementMonth"
              color="minimal"
              variant="icon"
              StartIcon={ChevronLeft}
            />
            <Button
              className="group p-1 opacity-70 hover:opacity-100 rtl:rotate-180"
              onClick={() => changeMonth(+1)}
              data-testid="incrementMonth"
              color="minimal"
              variant="icon"
              StartIcon={ChevronRight}
            />
          </div>
        </div>
      </div>
      <div className="border-subtle mb-2 grid grid-cols-7 gap-4 border-b border-t text-center md:mb-0 md:border-0">
        {weekdayNames(locale, weekStart, "short").map((weekDay) => (
          <div key={weekDay} className="text-emphasis my-4 text-xs font-medium uppercase tracking-widest">
            {weekDay}
          </div>
        ))}
      </div>
      <div className="relative grid grid-cols-7 gap-1 text-center">
        <Days
          weekStart={weekStart}
          selected={selected}
          {...passThroughProps}
          browsingDate={browsingDate}
          month={month}
          nextMonthButton={() => changeMonth(+1)}
        />
      </div>
    </div>
  );
};

export default DatePicker;
