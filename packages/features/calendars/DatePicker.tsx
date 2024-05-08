import { useEffect } from "react";
import { shallow } from "zustand/shallow";

import type { IFromUser, IToUser } from "@calcom/core/getUserAvailability";
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
  /** To identify days that are not available and should display OOO and redirect if toUser exists */
  slots?: Record<
    string,
    {
      time: string;
      userIds?: number[];
      away?: boolean;
      fromUser?: IFromUser;
      toUser?: IToUser;
      reason?: string;
      emoji?: string;
    }[]
  >;
};

export const Day = ({
  date,
  active,
  disabled,
  away,
  emoji,
  customClassName,
  ...props
}: JSX.IntrinsicElements["button"] & {
  active: boolean;
  date: Dayjs;
  away?: boolean;
  emoji?: string | null;
  customClassName?: {
    dayContainer?: string;
    dayActive?: string;
  };
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
          ? `${
              !customClassName?.dayActive
                ? "hover:border-brand-default text-emphasis bg-emphasis"
                : `hover:border-brand-default ${customClassName.dayActive}`
            }`
          : `${customClassName ? "" : " text-mute"}`
      )}
      data-testid="day"
      data-disabled={disabled}
      disabled={disabled}
      {...props}>
      {away && <span data-testid="away-emoji">{emoji}</span>}
      {!away && date.date()}
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
      <Button onClick={nextMonthButton} color="primary" EndIcon="arrow-right" data-testid="view_next_month">
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
  slots,
  customClassName,
  ...props
}: Omit<DatePickerProps, "locale" | "className" | "weekStart"> & {
  DayComponent?: React.FC<React.ComponentProps<typeof Day>>;
  browsingDate: Dayjs;
  weekStart: number;
  month: string | null;
  nextMonthButton: () => void;
  customClassName?: {
    datePickerDate?: string;
    datePickerDateActive?: string;
  };
}) => {
  // Create placeholder elements for empty days in first week
  const weekdayOfFirst = browsingDate.date(1).day();

  const includedDates = getAvailableDatesInMonth({
    browsingDate: browsingDate.toDate(),
    minDate,
    includedDates: props.includedDates,
  });

  const days: (Dayjs | null)[] = Array((weekdayOfFirst - weekStart + 7) % 7).fill(null);
  for (let day = 1, dayCount = daysInMonth(browsingDate); day <= dayCount; day++) {
    const date = browsingDate.set("date", day);
    days.push(date);
  }

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

  const daysToRenderForTheMonth = days.map((day) => {
    if (!day) return { day: null, disabled: true };
    const dateKey = yyyymmdd(day);
    const oooInfo = slots && slots?.[dateKey] ? slots?.[dateKey]?.find((slot) => slot.away) : null;
    const included = includedDates?.includes(dateKey);
    const excluded = excludedDates.includes(dateKey);

    const isOOOAllDay = !!(slots && slots[dateKey] && slots[dateKey].every((slot) => slot.away));
    const away = isOOOAllDay;
    const disabled = away ? !oooInfo?.toUser : !included || excluded;

    return {
      day: day,
      disabled,
      away,
      emoji: oooInfo?.emoji,
    };
  });

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
    if (isSelectedDateAvailable) {
      props.onChange(dayjs(selected));
    }
    if (!firstAvailableDateOfTheMonth) {
      props.onChange(null);
    }
  };

  useEffect(useHandleInitialDateSelection);

  return (
    <>
      {daysToRenderForTheMonth.map(({ day, disabled, away, emoji }, idx) => (
        <div key={day === null ? `e-${idx}` : `day-${day.format()}`} className="relative w-full pt-[100%]">
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
              customClassName={{
                dayContainer: customClassName?.datePickerDate,
                dayActive: customClassName?.datePickerDateActive,
              }}
              date={day}
              onClick={() => {
                props.onChange(day);
              }}
              disabled={disabled}
              active={isActive(day)}
              away={away}
              emoji={emoji}
            />
          )}
        </div>
      ))}

      {!props.isPending && includedDates && includedDates?.length === 0 && (
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
  slots,
  customClassNames,
  ...passThroughProps
}: DatePickerProps &
  Partial<React.ComponentProps<typeof Days>> & {
    customClassNames?: {
      datePickerTitle?: string;
      datePickerDays?: string;
      datePickersDates?: string;
      datePickerDatesActive?: string;
      datePickerToggle?: string;
    };
  }) => {
  const browsingDate = passThroughProps.browsingDate || dayjs().startOf("month");
  const { i18n } = useLocale();

  const changeMonth = (newMonth: number) => {
    if (onMonthChange) {
      onMonthChange(browsingDate.add(newMonth, "month"));
    }
  };
  const month = browsingDate
    ? new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(
        new Date(browsingDate.year(), browsingDate.month())
      )
    : null;

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xl">
        <span className="text-default w-1/2 text-base">
          {browsingDate ? (
            <>
              <strong
                className={classNames(`text-emphasis font-semibold`, customClassNames?.datePickerTitle)}>
                {month}
              </strong>{" "}
              <span className={classNames(`text-subtle font-medium`, customClassNames?.datePickerTitle)}>
                {browsingDate.format("YYYY")}
              </span>
            </>
          ) : (
            <SkeletonText className="h-8 w-24" />
          )}
        </span>
        <div className="text-emphasis">
          <div className="flex">
            <Button
              className={classNames(
                `group p-1 opacity-70 hover:opacity-100 rtl:rotate-180`,
                !browsingDate.isAfter(dayjs()) &&
                  `disabled:text-bookinglighter hover:bg-background hover:opacity-70`,
                customClassNames?.datePickerToggle
              )}
              onClick={() => changeMonth(-1)}
              disabled={!browsingDate.isAfter(dayjs())}
              data-testid="decrementMonth"
              color="minimal"
              variant="icon"
              StartIcon="chevron-left"
            />
            <Button
              className={classNames(
                `group p-1 opacity-70 hover:opacity-100 rtl:rotate-180`,
                `${customClassNames?.datePickerToggle}`
              )}
              onClick={() => changeMonth(+1)}
              data-testid="incrementMonth"
              color="minimal"
              variant="icon"
              StartIcon="chevron-right"
            />
          </div>
        </div>
      </div>
      <div className="border-subtle mb-2 grid grid-cols-7 gap-4 border-b border-t text-center md:mb-0 md:border-0">
        {weekdayNames(locale, weekStart, "short").map((weekDay) => (
          <div
            key={weekDay}
            className={classNames(
              `text-emphasis my-4 text-xs font-medium uppercase tracking-widest`,
              customClassNames?.datePickerDays
            )}>
            {weekDay}
          </div>
        ))}
      </div>
      <div className="relative grid grid-cols-7 grid-rows-6 gap-1 text-center">
        <Days
          customClassName={{
            datePickerDate: customClassNames?.datePickersDates,
            datePickerDateActive: customClassNames?.datePickerDatesActive,
          }}
          weekStart={weekStart}
          selected={selected}
          {...passThroughProps}
          browsingDate={browsingDate}
          month={month}
          nextMonthButton={() => changeMonth(+1)}
          slots={slots}
        />
      </div>
    </div>
  );
};

export default DatePicker;
