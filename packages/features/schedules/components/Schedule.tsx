import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ArrayPath,
  Control,
  ControllerRenderProps,
  FieldArrayWithId,
  FieldPath,
  FieldPathValue,
  FieldValues,
  UseFieldArrayRemove,
} from "react-hook-form";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import type { GroupBase, Props } from "react-select";

import type { AvailabilityFormValues } from "@calcom/atoms/availability/types";
import type { ConfigType } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { defaultDayRange as DEFAULT_DAY_RANGE } from "@calcom/lib/availability";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { TimeRange } from "@calcom/types/schedule";
import {
  Button,
  CheckboxField,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Select,
  SkeletonText,
  Switch,
} from "@calcom/ui";

export type { TimeRange };

export type ScheduleLabelsType = {
  addTime: string;
  copyTime: string;
  deleteTime: string;
};

export type FieldPathByValue<TFieldValues extends FieldValues, TValue> = {
  [Key in FieldPath<TFieldValues>]: FieldPathValue<TFieldValues, Key> extends TValue ? Key : never;
}[FieldPath<TFieldValues>];

export const ScheduleDay = <TFieldValues extends FieldValues>({
  name,
  weekday,
  control,
  handleSubmit,
  CopyButton,
  disabled,
  labels,
  userTimeFormat,
  className,
}: {
  name: ArrayPath<TFieldValues>;
  weekday: string;
  control: Control<TFieldValues>;
  handleSubmit?: (data: AvailabilityFormValues) => Promise<void>;
  CopyButton: JSX.Element;
  disabled?: boolean;
  labels?: ScheduleLabelsType;
  userTimeFormat: number | null;
  className?: {
    scheduleDay?: string;
    dayRanges?: string;
    timeRangeField?: string;
    labelAndSwitchContainer?: string;
    scheduleContainer?: string;
  };
}) => {
  const { watch, setValue, getValues } = useFormContext();
  const watchDayRange = watch(name);

  return (
    <div
      className={classNames(
        "flex w-full flex-col gap-4 last:mb-0 sm:flex-row sm:gap-6 sm:px-0",
        className?.scheduleDay
      )}
      data-testid={weekday}>
      {/* Label & switch container */}
      <div
        className={classNames(
          "flex h-[36px] items-center justify-between sm:w-32",
          className?.labelAndSwitchContainer
        )}>
        <div>
          <label className="text-default flex flex-row items-center space-x-2 rtl:space-x-reverse">
            <div>
              <Switch
                disabled={!watchDayRange || disabled}
                defaultChecked={watchDayRange && watchDayRange.length > 0}
                checked={watchDayRange && !!watchDayRange.length}
                data-testid={`${weekday}-switch`}
                onCheckedChange={(isChecked) => {
                  setValue(name, (isChecked ? [DEFAULT_DAY_RANGE] : []) as TFieldValues[typeof name]);
                  handleSubmit && handleSubmit(getValues() as AvailabilityFormValues);
                }}
              />
            </div>
            <span className="inline-block min-w-[88px] text-sm capitalize">{weekday}</span>
          </label>
        </div>
      </div>
      <>
        {!watchDayRange && <SkeletonText className="ml-1 mt-2.5 h-6 w-48" />}
        {watchDayRange.length > 0 && (
          <div className="flex sm:gap-2">
            <DayRanges
              userTimeFormat={userTimeFormat}
              labels={labels}
              control={control}
              name={name}
              disabled={disabled}
              handleSubmit={handleSubmit}
              className={{
                dayRanges: className?.dayRanges,
                timeRangeField: className?.timeRangeField,
              }}
            />
            {!disabled && <div className="block">{CopyButton}</div>}
          </div>
        )}
      </>
    </div>
  );
};

const CopyButton = ({
  getValuesFromDayRange,
  weekStart,
  labels,
  handleSubmit,
}: {
  getValuesFromDayRange: string;
  weekStart: number;
  labels?: ScheduleLabelsType;
  handleSubmit?: (data: AvailabilityFormValues) => Promise<void>;
}) => {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const fieldArrayName = getValuesFromDayRange.substring(0, getValuesFromDayRange.lastIndexOf("."));
  const { setValue, getValues } = useFormContext();
  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          className={classNames(
            "text-default",
            open && "ring-brand-500 !bg-subtle outline-none ring-2 ring-offset-1"
          )}
          data-testid="copy-button"
          type="button"
          tooltip={labels?.copyTime ?? t("copy_times_to_tooltip")}
          color="minimal"
          variant="icon"
          StartIcon="copy"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <CopyTimes
          weekStart={weekStart}
          disabled={parseInt(getValuesFromDayRange.replace(`${fieldArrayName}.`, ""), 10)}
          onClick={(selected) => {
            selected.forEach((day) => setValue(`${fieldArrayName}.${day}`, getValues(getValuesFromDayRange)));
            setOpen(false);
            handleSubmit && handleSubmit(getValues() as AvailabilityFormValues);
          }}
          onCancel={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </Dropdown>
  );
};

const Schedule = <
  TFieldValues extends FieldValues,
  TPath extends FieldPathByValue<TFieldValues, TimeRange[][]>
>(props: {
  name: TPath;
  control: Control<TFieldValues>;
  weekStart?: number;
  disabled?: boolean;
  handleSubmit?: (data: AvailabilityFormValues) => Promise<void>;
  labels?: ScheduleLabelsType;
  userTimeFormat?: number | null;
}) => {
  const query = useMeQuery();
  const { timeFormat } = query.data || { timeFormat: null };

  return <ScheduleComponent userTimeFormat={timeFormat} {...props} />;
};

export const ScheduleComponent = <
  TFieldValues extends FieldValues,
  TPath extends FieldPathByValue<TFieldValues, TimeRange[][]>
>({
  name,
  control,
  handleSubmit,
  disabled,
  weekStart = 0,
  labels,
  userTimeFormat,
  className,
}: {
  name: TPath;
  control: Control<TFieldValues>;
  handleSubmit?: (data: AvailabilityFormValues) => Promise<void>;
  weekStart?: number;
  disabled?: boolean;
  labels?: ScheduleLabelsType;
  userTimeFormat: number | null;
  className?: {
    schedule?: string;
    scheduleDay?: string;
    dayRanges?: string;
    timeRanges?: string;
    labelAndSwitchContainer?: string;
  };
}) => {
  const { i18n } = useLocale();

  return (
    <div className={classNames("flex flex-col gap-4 p-2 sm:p-4", className?.schedule)}>
      {/* First iterate for each day */}
      {weekdayNames(i18n.language, weekStart, "long").map((weekday, num) => {
        const weekdayIndex = (num + weekStart) % 7;
        const dayRangeName = `${name}.${weekdayIndex}` as ArrayPath<TFieldValues>;
        return (
          <ScheduleDay
            className={{
              scheduleDay: className?.scheduleDay,
              dayRanges: className?.dayRanges,
              timeRangeField: className?.timeRanges,
              labelAndSwitchContainer: className?.labelAndSwitchContainer,
            }}
            userTimeFormat={userTimeFormat}
            labels={labels}
            disabled={disabled}
            name={dayRangeName}
            key={weekday}
            weekday={weekday}
            control={control}
            handleSubmit={handleSubmit}
            CopyButton={
              <CopyButton
                weekStart={weekStart}
                labels={labels}
                getValuesFromDayRange={dayRangeName}
                handleSubmit={handleSubmit}
              />
            }
          />
        );
      })}
    </div>
  );
};

export const DayRanges = <TFieldValues extends FieldValues>({
  name,
  disabled,
  control,
  labels,
  userTimeFormat,
  className,
  handleSubmit,
}: {
  name: ArrayPath<TFieldValues>;
  control?: Control<TFieldValues>;
  disabled?: boolean;
  labels?: ScheduleLabelsType;
  userTimeFormat: number | null;
  className?: {
    dayRanges?: string;
    timeRangeField?: string;
  };
  handleSubmit?: (data: AvailabilityFormValues) => Promise<void>;
}) => {
  const { t } = useLocale();
  const { getValues } = useFormContext();

  const { remove, fields, prepend, append } = useFieldArray({
    control,
    name,
  });

  if (!fields.length) return null;

  return (
    <div className={classNames("flex flex-col gap-2", className?.dayRanges)}>
      {fields.map((field, index: number) => (
        <Fragment key={field.id}>
          <div className="flex gap-1 last:mb-0 sm:gap-2">
            <Controller
              name={`${name}.${index}`}
              render={({ field }) => (
                <TimeRangeField
                  className={className?.timeRangeField}
                  userTimeFormat={userTimeFormat}
                  handleSubmit={handleSubmit}
                  {...field}
                />
              )}
            />
            {index === 0 && (
              <Button
                disabled={disabled}
                data-testid="add-time-availability"
                tooltip={labels?.addTime ?? t("add_time_availability")}
                className="text-default"
                type="button"
                color="minimal"
                variant="icon"
                StartIcon="plus"
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const slotRange: any = getDateSlotRange(
                    getValues(`${name}.${fields.length - 1}`),
                    getValues(`${name}.0`)
                  );

                  if (slotRange?.append) {
                    append(slotRange.append);
                    handleSubmit && handleSubmit(getValues() as AvailabilityFormValues);
                  }

                  if (slotRange?.prepend) {
                    prepend(slotRange.prepend);
                    handleSubmit && handleSubmit(getValues() as AvailabilityFormValues);
                  }
                }}
              />
            )}
            {index !== 0 && (
              <RemoveTimeButton
                index={index}
                remove={remove}
                handleSubmit={handleSubmit}
                className="text-default mx-2 border-none"
              />
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
};

const RemoveTimeButton = ({
  index,
  remove,
  disabled,
  className,
  labels,
  handleSubmit,
}: {
  index: number | number[];
  remove: UseFieldArrayRemove;
  className?: string;
  disabled?: boolean;
  labels?: ScheduleLabelsType;
  handleSubmit?: (data: AvailabilityFormValues) => Promise<void>;
}) => {
  const { t } = useLocale();
  const { getValues } = useFormContext();
  return (
    <Button
      disabled={disabled}
      type="button"
      variant="icon"
      color="destructive"
      StartIcon="trash"
      onClick={() => {
        remove(index);
        handleSubmit && handleSubmit(getValues() as AvailabilityFormValues);
      }}
      className={className}
      tooltip={labels?.deleteTime ?? t("delete")}
    />
  );
};

const TimeRangeField = ({
  className,
  value,
  onChange,
  disabled,
  userTimeFormat,
  handleSubmit,
}: {
  className?: string;
  disabled?: boolean;
  userTimeFormat: number | null;
  handleSubmit?: (data: AvailabilityFormValues) => Promise<void>;
} & ControllerRenderProps) => {
  const { getValues } = useFormContext();
  // this is a controlled component anyway given it uses LazySelect, so keep it RHF agnostic.
  return (
    <div className={classNames("flex flex-row gap-2 sm:gap-3", className)}>
      <LazySelect
        userTimeFormat={userTimeFormat}
        className="block w-[90px] sm:w-[100px]"
        isDisabled={disabled}
        value={value.start}
        menuPlacement="bottom"
        onChange={(option) => {
          const newStart = new Date(option?.value as number);
          if (newStart >= new Date(value.end)) {
            const newEnd = new Date(option?.value as number);
            newEnd.setMinutes(newEnd.getMinutes() + INCREMENT);
            onChange({ ...value, start: newStart, end: newEnd });
          } else {
            onChange({ ...value, start: newStart });
          }
          handleSubmit && handleSubmit(getValues() as AvailabilityFormValues);
        }}
      />
      <span className="text-default w-2 self-center"> - </span>
      <LazySelect
        userTimeFormat={userTimeFormat}
        className="block w-[90px] rounded-md sm:w-[100px]"
        isDisabled={disabled}
        value={value.end}
        min={value.start}
        menuPlacement="bottom"
        onChange={(option) => {
          onChange({ ...value, end: new Date(option?.value as number) });
          handleSubmit && handleSubmit(getValues() as AvailabilityFormValues);
        }}
      />
    </div>
  );
};

const LazySelect = ({
  value,
  min,
  max,
  userTimeFormat,
  menuPlacement,
  ...props
}: Omit<Props<IOption, false, GroupBase<IOption>>, "value"> & {
  value: ConfigType;
  min?: ConfigType;
  max?: ConfigType;
  userTimeFormat: number | null;
}) => {
  // Lazy-loaded options, otherwise adding a field has a noticeable redraw delay.
  const { options, filter } = useOptions(userTimeFormat);

  useEffect(() => {
    filter({ current: value });
  }, [filter, value]);

  return (
    <Select
      options={options}
      onMenuOpen={() => {
        if (min) filter({ offset: min });
        if (max) filter({ limit: max });
        if (!min && !max) filter({ offset: 0, limit: 0 });
      }}
      menuPlacement={menuPlacement}
      value={options.find((option) => option.value === dayjs(value).toDate().valueOf())}
      onMenuClose={() => filter({ current: value })}
      components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
      {...props}
    />
  );
};

interface IOption {
  readonly label: string;
  readonly value: number;
}

/**
 * Creates an array of times on a 15 minute interval from
 * 00:00:00 (Start of day) to
 * 23:45:00 (End of day with enough time for 15 min booking)
 */
/** Begin Time Increments For Select */
const INCREMENT = Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL) || 15;
const useOptions = (timeFormat: number | null) => {
  const [filteredOptions, setFilteredOptions] = useState<IOption[]>([]);

  const options = useMemo(() => {
    const end = dayjs().utc().endOf("day");
    const options: IOption[] = [];
    for (
      let t = dayjs().utc().startOf("day");
      t.isBefore(end);
      t = t.add(INCREMENT + (!t.add(INCREMENT).isSame(t, "day") ? -1 : 0), "minutes")
    ) {
      options.push({
        value: t.toDate().valueOf(),
        label: dayjs(t)
          .utc()
          .format(timeFormat === 12 ? "h:mma" : "HH:mm"),
      });
    }
    // allow 23:59
    options.push({
      value: end.toDate().valueOf(),
      label: dayjs(end)
        .utc()
        .format(timeFormat === 12 ? "h:mma" : "HH:mm"),
    });
    return options;
  }, [timeFormat]);

  const filter = useCallback(
    ({ offset, limit, current }: { offset?: ConfigType; limit?: ConfigType; current?: ConfigType }) => {
      if (current) {
        const currentOption = options.find((option) => option.value === dayjs(current).toDate().valueOf());
        if (currentOption) setFilteredOptions([currentOption]);
      } else
        setFilteredOptions(
          options.filter((option) => {
            const time = dayjs(option.value);
            return (!limit || time.isBefore(limit)) && (!offset || time.isAfter(offset));
          })
        );
    },
    [options]
  );

  return { options: filteredOptions, filter };
};

const getDateSlotRange = (endField?: FieldArrayWithId, startField?: FieldArrayWithId) => {
  const timezoneStartRange = dayjs((startField as unknown as TimeRange).start).utc();
  const nextRangeStart = dayjs((endField as unknown as TimeRange).end).utc();
  const nextRangeEnd =
    nextRangeStart.hour() === 23
      ? dayjs(nextRangeStart).add(59, "minutes").add(59, "seconds").add(999, "milliseconds")
      : dayjs(nextRangeStart).add(1, "hour");

  const endOfDay = nextRangeStart.endOf("day");

  if (!nextRangeStart.isSame(endOfDay)) {
    return {
      append: {
        start: nextRangeStart.toDate(),
        end: nextRangeEnd.isAfter(endOfDay) ? endOfDay.toDate() : nextRangeEnd.toDate(),
      },
    };
  }

  const previousRangeStart = dayjs((startField as unknown as TimeRange).start).subtract(1, "hour");
  const startOfDay = timezoneStartRange.startOf("day");

  if (!timezoneStartRange.isSame(startOfDay)) {
    return {
      prepend: {
        start: previousRangeStart.isBefore(startOfDay) ? startOfDay.toDate() : previousRangeStart.toDate(),
        end: timezoneStartRange.toDate(),
      },
    };
  }
};

const CopyTimes = ({
  disabled,
  onClick,
  onCancel,
  weekStart,
}: {
  disabled: number;
  onClick: (selected: number[]) => void;
  onCancel: () => void;
  weekStart: number;
}) => {
  const [selected, setSelected] = useState<number[]>([]);
  const { i18n, t } = useLocale();
  const itteratablesByKeyRef = useRef<(HTMLInputElement | HTMLButtonElement)[]>([]);
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  const handleKeyDown = (event: KeyboardEvent) => {
    const itteratables = itteratablesByKeyRef.current;
    const isActionRequired =
      event.key === "Tab" || event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter";
    if (!isActionRequired || !itteratables.length) return;
    event.preventDefault();
    const currentFocused = document.activeElement as HTMLInputElement | HTMLButtonElement;
    let currentIndex = itteratables.findIndex((checkbox) => checkbox === currentFocused);
    if (event.key === "Enter") {
      if (currentIndex === -1) return;
      currentFocused.click();
      return;
    }
    if (currentIndex === -1) {
      itteratables[0].focus();
    } else {
      // Move focus based on the arrow key pressed
      if (event.key === "ArrowUp") {
        currentIndex = (currentIndex - 1 + itteratables.length) % itteratables.length;
      } else if (event.key === "ArrowDown" || event.key === "Tab") {
        currentIndex = (currentIndex + 1) % itteratables.length;
      }
      itteratables[currentIndex].focus();
    }
  };

  return (
    <div className="space-y-2 py-2">
      <div className="p-2">
        <p className="h6 text-emphasis pb-3 pl-1 text-xs font-medium uppercase">{t("copy_times_to")}</p>
        <ol className="space-y-2">
          <li key="select all">
            <label className="text-default flex w-full items-center justify-between">
              <span className="px-1">{t("select_all")}</span>
              <CheckboxField
                description=""
                value={t("select_all")}
                checked={selected.length === 7}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected([0, 1, 2, 3, 4, 5, 6]);
                  } else if (!e.target.checked) {
                    setSelected([]);
                  }
                }}
                ref={(ref) => {
                  if (ref) {
                    itteratablesByKeyRef.current.push(ref as HTMLInputElement);
                  }
                }}
              />
            </label>
          </li>
          {weekdayNames(i18n.language, weekStart).map((weekday, num) => {
            const weekdayIndex = (num + weekStart) % 7;
            return (
              <li key={weekday}>
                <label className="text-default flex w-full items-center justify-between">
                  <span className="px-1">{weekday}</span>
                  <CheckboxField
                    description=""
                    value={weekdayIndex}
                    checked={selected.includes(weekdayIndex) || disabled === weekdayIndex}
                    disabled={disabled === weekdayIndex}
                    onChange={(e) => {
                      if (e.target.checked && !selected.includes(weekdayIndex)) {
                        setSelected(selected.concat([weekdayIndex]));
                      } else if (!e.target.checked && selected.includes(weekdayIndex)) {
                        setSelected(selected.filter((item) => item !== weekdayIndex));
                      }
                    }}
                    ref={(ref) => {
                      if (ref && disabled !== weekdayIndex) {
                        //we don't need to iterate over disabled elements
                        itteratablesByKeyRef.current.push(ref as HTMLInputElement);
                      }
                    }}
                  />
                </label>
              </li>
            );
          })}
        </ol>
      </div>
      <hr className="border-subtle" />
      <div className="space-x-2 px-2 rtl:space-x-reverse">
        <Button
          color="minimal"
          onClick={() => onCancel()}
          ref={(ref) => {
            if (ref) {
              itteratablesByKeyRef.current.push(ref as HTMLButtonElement);
            }
          }}>
          {t("cancel")}
        </Button>
        <Button
          color="primary"
          onClick={() => onClick(selected)}
          ref={(ref) => {
            if (ref) {
              itteratablesByKeyRef.current.push(ref as HTMLButtonElement);
            }
          }}>
          {t("apply")}
        </Button>
      </div>
    </div>
  );
};

export default Schedule;
