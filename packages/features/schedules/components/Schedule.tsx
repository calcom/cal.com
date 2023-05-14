import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  Dropdown,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Select,
  SkeletonText,
  Switch,
  Checkbox
} from "@calcom/ui";
import { Copy, Plus, Trash } from "@calcom/ui/components/icon";

export type { TimeRange };

export type FieldPathByValue<TFieldValues extends FieldValues, TValue> = {
  [Key in FieldPath<TFieldValues>]: FieldPathValue<TFieldValues, Key> extends TValue ? Key : never;
}[FieldPath<TFieldValues>];

const ScheduleDay = <TFieldValues extends FieldValues>({
  name,
  weekday,
  control,
  CopyButton,
}: {
  name: ArrayPath<TFieldValues>;
  weekday: string;
  control: Control<TFieldValues>;
  CopyButton: JSX.Element;
}) => {
  const { watch, setValue } = useFormContext();
  const watchDayRange = watch(name);

  return (
    <div className="mb-4 flex w-full flex-col last:mb-0 sm:flex-row sm:px-0">
      {/* Label & switch container */}
      <div className="flex h-[36px] items-center justify-between sm:w-32">
        <div>
          <label className="text-default flex flex-row items-center space-x-2 rtl:space-x-reverse">
            <div>
              <Switch
                disabled={!watchDayRange}
                defaultChecked={watchDayRange && watchDayRange.length > 0}
                checked={watchDayRange && !!watchDayRange.length}
                onCheckedChange={(isChecked) => {
                  setValue(name, (isChecked ? [DEFAULT_DAY_RANGE] : []) as TFieldValues[typeof name]);
                }}
              />
            </div>
            <span className="inline-block min-w-[88px] text-sm capitalize">{weekday}</span>
            {watchDayRange && !!watchDayRange.length && <div className="sm:hidden">{CopyButton}</div>}
          </label>
        </div>
      </div>
      <>
        {watchDayRange ? (
          <div className="flex sm:ml-2">
            <DayRanges control={control} name={name} />
            {!!watchDayRange.length && <div className="hidden sm:block">{CopyButton}</div>}
          </div>
        ) : (
          <SkeletonText className="mt-2.5 ml-1 h-6 w-48" />
        )}
      </>
    </div>
  );
};

const CopyButton = ({
  getValuesFromDayRange,
  weekStart,
}: {
  getValuesFromDayRange: string;
  weekStart: number;
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
          type="button"
          tooltip={t("copy_times_to_tooltip")}
          color="minimal"
          variant="icon"
          StartIcon={Copy}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <CopyTimes
          weekStart={weekStart}
          disabled={parseInt(getValuesFromDayRange.replace(fieldArrayName + ".", ""), 10)}
          onClick={(selected) => {
            selected.forEach((day) => setValue(`${fieldArrayName}.${day}`, getValues(getValuesFromDayRange)));
            setOpen(false);
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
>({
  name,
  control,
  weekStart = 0,
}: {
  name: TPath;
  control: Control<TFieldValues>;
  weekStart?: number;
}) => {
  const { i18n } = useLocale();

  return (
    <div className="p-4">
      {/* First iterate for each day */}
      {weekdayNames(i18n.language, weekStart, "long").map((weekday, num) => {
        const weekdayIndex = (num + weekStart) % 7;
        const dayRangeName = `${name}.${weekdayIndex}` as ArrayPath<TFieldValues>;
        return (
          <ScheduleDay
            name={dayRangeName}
            key={weekday}
            weekday={weekday}
            control={control}
            CopyButton={<CopyButton weekStart={weekStart} getValuesFromDayRange={dayRangeName} />}
          />
        );
      })}
    </div>
  );
};

export const DayRanges = <TFieldValues extends FieldValues>({
  name,
  control,
}: {
  name: ArrayPath<TFieldValues>;
  control?: Control<TFieldValues>;
}) => {
  const { t } = useLocale();
  const { getValues } = useFormContext();

  const { remove, fields, append } = useFieldArray({
    control,
    name,
  });

  return (
    <div>
      {fields.map((field, index: number) => (
        <Fragment key={field.id}>
          <div className="mb-2 flex last:mb-0">
            <Controller name={`${name}.${index}`} render={({ field }) => <TimeRangeField {...field} />} />
            {index === 0 && (
              <Button
                tooltip={t("add_time_availability")}
                className="text-default mx-2 "
                type="button"
                color="minimal"
                variant="icon"
                StartIcon={Plus}
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const nextRange: any = getNextRange(getValues(`${name}.${fields.length - 1}`));
                  if (nextRange) append(nextRange);
                }}
              />
            )}
            {index !== 0 && <RemoveTimeButton index={index} remove={remove} className="text-default mx-2 border-none" />}
          </div>
        </Fragment>
      ))}
    </div>
  );
};

const RemoveTimeButton = ({
  index,
  remove,
  className,
}: {
  index: number | number[];
  remove: UseFieldArrayRemove;
  className?: string;
}) => {
  const { t } = useLocale();
  return (
    <Button
      type="button"
      variant="icon"
      color="destructive"
      StartIcon={Trash}
      onClick={() => remove(index)}
      className={className}
      tooltip={t("delete")}
    />
  );
};

const TimeRangeField = ({ className, value, onChange }: { className?: string } & ControllerRenderProps) => {
  // this is a controlled component anyway given it uses LazySelect, so keep it RHF agnostic.
  return (
    <div className={className}>
      <LazySelect
        className="inline-block w-[100px]"
        value={value.start}
        max={value.end}
        onChange={(option) => {
          onChange({ ...value, start: new Date(option?.value as number) });
        }}
      />
      <span className="text-default mx-2 w-2 self-center"> - </span>
      <LazySelect
        className="inline-block w-[100px] rounded-md"
        value={value.end}
        min={value.start}
        onChange={(option) => {
          onChange({ ...value, end: new Date(option?.value as number) });
        }}
      />
    </div>
  );
};

const LazySelect = ({
  value,
  min,
  max,
  ...props
}: Omit<Props<IOption, false, GroupBase<IOption>>, "value"> & {
  value: ConfigType;
  min?: ConfigType;
  max?: ConfigType;
}) => {
  // Lazy-loaded options, otherwise adding a field has a noticeable redraw delay.
  const { options, filter } = useOptions();

  useEffect(() => {
    filter({ current: value });
  }, [filter, value]);

  return (
    <Select
      options={options}
      onMenuOpen={() => {
        if (min) filter({ offset: min });
        if (max) filter({ limit: max });
      }}
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
const INCREMENT = 15;
const useOptions = () => {
  // Get user so we can determine 12/24 hour format preferences
  const query = useMeQuery();
  const { timeFormat } = query.data || { timeFormat: null };

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

const getNextRange = (field?: FieldArrayWithId) => {
  const nextRangeStart = dayjs((field as unknown as TimeRange).end).utc();
  const nextRangeEnd =
    nextRangeStart.hour() === 23
      ? dayjs(nextRangeStart).add(59, "minutes").add(59, "seconds").add(999, "milliseconds")
      : dayjs(nextRangeStart).add(1, "hour");

  if (
    nextRangeEnd.isBefore(nextRangeStart.endOf("day")) ||
    nextRangeEnd.isSame(nextRangeStart.endOf("day"))
  ) {
    return {
      start: nextRangeStart.toDate(),
      end: nextRangeEnd.toDate(),
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

  return (
    <div className="space-y-2 py-2">
      <div className="p-2">
        <p className="h6 text-emphasis pb-3 pl-1 text-xs font-medium uppercase">{t("copy_times_to")}</p>
        <ol className="space-y-2">
          <li key="select all">
            <label className="text-default flex w-full items-center justify-between">
              <span className="px-1">{t('select_all')}</span>
              <Checkbox
                description={""}
                value={t('select_all')}
                checked={selected.length === 7}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected([0, 1, 2, 3, 4, 5, 6]);
                  } else if (!e.target.checked) {
                    setSelected([]);
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
                  <Checkbox
                    description={""}
                    value={weekdayIndex}
                    checked={selected.includes(weekdayIndex) || disabled === weekdayIndex}
                    disabled={disabled === weekdayIndex}
                    onChange={(e) => {
                      if (e.target.checked && !selected.includes(weekdayIndex)) {
                        setSelected(selected.concat([weekdayIndex]));
                      } else if (!e.target.checked && selected.includes(weekdayIndex)) {
                        setSelected(selected.filter(item => item !== weekdayIndex));
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
        <Button color="minimal" onClick={() => onCancel()}>
          {t("cancel")}
        </Button>
        <Button color="primary" onClick={() => onClick(selected)}>
          {t("apply")}
        </Button>
      </div>
    </div>
  );
};

export default Schedule;
