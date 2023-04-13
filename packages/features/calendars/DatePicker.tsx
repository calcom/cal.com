import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useEmbedStyles } from "@calcom/embed-core/embed-iframe";
import classNames from "@calcom/lib/classNames";
import { daysInMonth, yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import { Button, SkeletonText } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

export type DatePickerProps = {
  /** which day of the week to render the calendar. Usually Sunday (=0) or Monday (=1) - default: Sunday */
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Fires whenever a selected date is changed. */
  onChange: (date: Dayjs) => void;
  /** Fires when the month is changed. */
  onMonthChange?: (date: Dayjs) => void;
  /** which date is currently selected (not tracked from here) */
  selected?: Dayjs | null;
  /** defaults to current date. */
  minDate?: Dayjs;
  /** Furthest date selectable in the future, default = UNLIMITED */
  maxDate?: Dayjs;
  /** locale, any IETF language tag, e.g. "hu-HU" - defaults to Browser settings */
  locale: string;
  /** Defaults to [], which dates are not bookable. Array of valid dates like: ["2022-04-23", "2022-04-24"] */
  excludedDates?: string[];
  /** defaults to all, which dates are bookable (inverse of excludedDates) */
  includedDates?: string[];
  /** allows adding classes to the container */
  className?: string;
  /** Shows a small loading spinner next to the month name */
  isLoading?: boolean;
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
  const enabledDateButtonEmbedStyles = useEmbedStyles("enabledDateButton");
  const disabledDateButtonEmbedStyles = useEmbedStyles("disabledDateButton");
  return (
    <button
      type="button"
      style={disabled ? { ...disabledDateButtonEmbedStyles } : { ...enabledDateButtonEmbedStyles }}
      className={classNames(
        "disabled:text-bookinglighter absolute top-0 left-0 right-0 bottom-0 mx-auto w-full rounded-md border-2 border-transparent text-center text-sm font-medium disabled:cursor-default disabled:border-transparent disabled:font-light ",
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
        <span className="absolute left-0 right-0 bottom-0 h-2/5 align-middle text-4xl leading-[0rem]">.</span>
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
    <div className=" bg-muted border-subtle absolute top-40 left-1/2 -mt-10 w-max -translate-x-1/2 -translate-y-1/2 transform rounded-md border p-8 shadow-sm">
      <h4 className="text-emphasis  mb-4 font-medium">{t("no_availability_in_month", { month: month })}</h4>
      <Button onClick={nextMonthButton} color="primary" EndIcon={ArrowRight}>
        {t("view_next_month")}
      </Button>
    </div>
  );
};

const Days = ({
  minDate = dayjs.utc(),
  excludedDates = [],
  browsingDate,
  weekStart,
  DayComponent = Day,
  selected,
  month,
  nextMonthButton,
  ...props
}: Omit<DatePickerProps, "locale" | "className" | "weekStart"> & {
  DayComponent?: React.FC<React.ComponentProps<typeof Day>>;
  browsingDate: Dayjs;
  weekStart: number;
  month: string | null;
  nextMonthButton: () => void;
}) => {
  // Create placeholder elements for empty days in first week
  const weekdayOfFirst = browsingDate.day();
  const currentDate = minDate.utcOffset(browsingDate.utcOffset());
  const availableDates = (includedDates: string[] | undefined) => {
    const dates = [];
    const lastDateOfMonth = browsingDate.date(daysInMonth(browsingDate));
    for (
      let date = currentDate;
      date.isBefore(lastDateOfMonth) || date.isSame(lastDateOfMonth, "day");
      date = date.add(1, "day")
    ) {
      // even if availableDates is given, filter out the passed included dates
      if (includedDates && !includedDates.includes(yyyymmdd(date))) {
        continue;
      }
      dates.push(yyyymmdd(date));
    }
    return dates;
  };

  const includedDates = currentDate.isSame(browsingDate, "month")
    ? availableDates(props.includedDates)
    : props.includedDates;

  const days: (Dayjs | null)[] = Array((weekdayOfFirst - weekStart + 7) % 7).fill(null);
  for (let day = 1, dayCount = daysInMonth(browsingDate); day <= dayCount; day++) {
    const date = browsingDate.set("date", day);
    days.push(date);
  }

  return (
    <>
      {days.map((day, idx) => (
        <div key={day === null ? `e-${idx}` : `day-${day.format()}`} className="relative w-full pt-[100%]">
          {day === null ? (
            <div key={`e-${idx}`} />
          ) : props.isLoading ? (
            <button
              className=" bg-muted text-muted opcaity-50 absolute top-0 left-0 right-0 bottom-0 mx-auto flex w-full items-center justify-center rounded-sm border-transparent text-center"
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
              disabled={
                (includedDates && !includedDates.includes(yyyymmdd(day))) ||
                excludedDates.includes(yyyymmdd(day))
              }
              active={selected ? yyyymmdd(selected) === yyyymmdd(day) : false}
            />
          )}
        </div>
      ))}

      {!props.isLoading && includedDates && includedDates?.length === 0 && (
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
      <div className="mb-4 flex items-center justify-between text-xl font-light">
        <span className="text-default w-1/2 text-base">
          {browsingDate ? (
            <>
              <strong className="text-emphasis font-semibold">{month}</strong>{" "}
              <span className="text-subtle">{browsingDate.format("YYYY")}</span>
            </>
          ) : (
            <SkeletonText className="h-8 w-24" />
          )}
        </span>
        <div className="text-emphasis">
          <div className="flex">
            <Button
              className={classNames(
                "group p-1 opacity-70 hover:opacity-100",
                !browsingDate.isAfter(dayjs()) &&
                  "disabled:text-bookinglighter hover:bg-background hover:opacity-70"
              )}
              onClick={() => changeMonth(-1)}
              disabled={!browsingDate.isAfter(dayjs())}
              data-testid="decrementMonth"
              color="minimal"
              variant="icon"
              StartIcon={ChevronLeftIcon}
            />
            <Button
              className="group p-1 opacity-70 hover:opacity-100"
              onClick={() => changeMonth(+1)}
              data-testid="incrementMonth"
              color="minimal"
              variant="icon"
              StartIcon={ChevronRightIcon}
            />
          </div>
        </div>
      </div>
      <div className="border-subtle mb-2 grid grid-cols-7 gap-4 border-t border-b text-center md:mb-0 md:border-0">
        {weekdayNames(locale, weekStart, "short").map((weekDay) => (
          <div key={weekDay} className="text-emphasis my-4 text-xs uppercase tracking-widest">
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
