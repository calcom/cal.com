import classNames from "classnames";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { GroupBase, Props } from "react-select";

import dayjs, { Dayjs, ConfigType } from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import Dropdown, { DropdownMenuContent } from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";
import { Tooltip } from "@calcom/ui/Tooltip";

import { defaultDayRange } from "@lib/availability";
import { weekdayNames } from "@lib/core/i18n/weekday";
import useMeQuery from "@lib/hooks/useMeQuery";
import { TimeRange } from "@lib/types/schedule";

import Select from "@components/ui/form/Select";

/** Begin Time Increments For Select */
const increment = 15;

type Option = {
  readonly label: string;
  readonly value: number;
};

/**
 * Creates an array of times on a 15 minute interval from
 * 00:00:00 (Start of day) to
 * 23:45:00 (End of day with enough time for 15 min booking)
 */
const useOptions = () => {
  // Get user so we can determine 12/24 hour format preferences
  const query = useMeQuery();
  const { timeFormat } = query.data || { timeFormat: null };

  const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);

  const options = useMemo(() => {
    const end = dayjs().utc().endOf("day");
    let t: Dayjs = dayjs().utc().startOf("day");

    const options: Option[] = [];
    while (t.isBefore(end)) {
      options.push({
        value: t.toDate().valueOf(),
        label: dayjs(t)
          .utc()
          .format(timeFormat === 12 ? "h:mma" : "HH:mm"),
      });
      t = t.add(increment, "minutes");
    }
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

type TimeRangeFieldProps = {
  name: string;
  className?: string;
};

const LazySelect = ({
  value,
  min,
  max,
  ...props
}: Omit<Props<Option, false, GroupBase<Option>>, "value"> & {
  value: ConfigType;
  min?: ConfigType;
  max?: ConfigType;
}) => {
  // Lazy-loaded options, otherwise adding a field has a noticable redraw delay.
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
      {...props}
    />
  );
};

const TimeRangeField = ({ name, className }: TimeRangeFieldProps) => {
  const { watch } = useFormContext();
  const minEnd = watch(`${name}.start`);
  const maxStart = watch(`${name}.end`);
  return (
    <div className={classNames("flex flex-grow items-center space-x-3", className)}>
      <Controller
        name={`${name}.start`}
        render={({ field: { onChange, value } }) => {
          return (
            <LazySelect
              className="w-[120px]"
              value={value}
              max={maxStart}
              onChange={(option) => {
                onChange(new Date(option?.value as number));
              }}
            />
          );
        }}
      />
      <span>-</span>
      <Controller
        name={`${name}.end`}
        render={({ field: { onChange, value } }) => (
          <LazySelect
            className="flex-grow sm:w-[120px]"
            value={value}
            min={minEnd}
            onChange={(option) => {
              onChange(new Date(option?.value as number));
            }}
          />
        )}
      />
    </div>
  );
};

type ScheduleBlockProps = {
  day: number;
  weekday: string;
  name: string;
};

const CopyTimes = ({ disabled, onApply }: { disabled: number[]; onApply: (selected: number[]) => void }) => {
  const [selected, setSelected] = useState<number[]>([]);
  const { i18n, t } = useLocale();
  return (
    <div className="m-4 space-y-2 py-4">
      <p className="h6 text-xs font-medium uppercase text-neutral-400">Copy times to</p>
      <ol className="space-y-2">
        {weekdayNames(i18n.language).map((weekday, num) => (
          <li key={weekday}>
            <label className="flex w-full items-center justify-between">
              <span>{weekday}</span>
              <input
                value={num}
                defaultChecked={disabled.includes(num)}
                disabled={disabled.includes(num)}
                onChange={(e) => {
                  if (e.target.checked && !selected.includes(num)) {
                    setSelected(selected.concat([num]));
                  } else if (!e.target.checked && selected.includes(num)) {
                    setSelected(selected.slice(selected.indexOf(num), 1));
                  }
                }}
                type="checkbox"
                className="inline-block rounded-sm border-gray-300 text-neutral-900 focus:ring-neutral-500 disabled:text-neutral-400"
              />
            </label>
          </li>
        ))}
      </ol>
      <div className="pt-2">
        <Button className="w-full justify-center" color="primary" onClick={() => onApply(selected)}>
          {t("apply")}
        </Button>
      </div>
    </div>
  );
};

export const DayRanges = ({
  name,
  defaultValue = [defaultDayRange],
}: {
  name: string;
  defaultValue?: TimeRange[];
}) => {
  const { setValue, watch } = useFormContext();
  // XXX: Hack to make copying times work; `fields` is out of date until save.
  const watcher = watch(name);
  const { t } = useLocale();
  const { fields, replace, append, remove } = useFieldArray({
    name,
  });

  useEffect(() => {
    if (defaultValue.length && !fields.length) {
      replace(defaultValue);
    }
  }, [replace, defaultValue, fields.length]);

  const handleAppend = () => {
    // FIXME: Fix type-inference, can't get this to work. @see https://github.com/react-hook-form/react-hook-form/issues/4499
    const nextRangeStart = dayjs((fields[fields.length - 1] as unknown as TimeRange).end);
    const nextRangeEnd = dayjs(nextRangeStart).add(1, "hour");

    if (nextRangeEnd.isBefore(nextRangeStart.endOf("day"))) {
      return append({
        start: nextRangeStart.toDate(),
        end: nextRangeEnd.toDate(),
      });
    }
  };

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-center rtl:space-x-reverse">
          <div className="flex flex-grow space-x-1 sm:flex-grow-0">
            <TimeRangeField name={`${name}.${index}`} />
            <Button
              type="button"
              size="icon"
              color="minimal"
              StartIcon={Icon.FiTrash}
              onClick={() => remove(index)}
            />
          </div>
          {index === 0 && (
            <div className="absolute top-2 right-0 text-right sm:relative sm:top-0 sm:flex-grow">
              <Tooltip content={t("add_time_availability") as string}>
                <Button
                  className="text-neutral-400"
                  type="button"
                  color="minimal"
                  size="icon"
                  StartIcon={Icon.FiPlus}
                  onClick={handleAppend}
                />
              </Tooltip>
              <Dropdown>
                <Tooltip content={t("duplicate") as string}>
                  <Button
                    type="button"
                    color="minimal"
                    size="icon"
                    StartIcon={Icon.FiCopy}
                    onClick={handleAppend}
                  />
                </Tooltip>
                <DropdownMenuContent>
                  <CopyTimes
                    disabled={[parseInt(name.substring(name.lastIndexOf(".") + 1), 10)]}
                    onApply={(selected) =>
                      selected.forEach((day) => {
                        // TODO: Figure out why this is different?
                        // console.log(watcher, fields);
                        setValue(name.substring(0, name.lastIndexOf(".") + 1) + day, watcher);
                      })
                    }
                  />
                </DropdownMenuContent>
              </Dropdown>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ScheduleBlock = ({ name, day, weekday }: ScheduleBlockProps) => {
  const { t } = useLocale();

  const form = useFormContext();
  const watchAvailable = form.watch(`${name}.${day}`, []);

  return (
    <fieldset className="relative flex flex-col justify-between space-y-2 py-5 sm:flex-row sm:space-y-0">
      <label
        className={classNames(
          "flex space-x-2 rtl:space-x-reverse",
          !watchAvailable.length ? "w-full" : "w-1/3"
        )}>
        <div className={classNames(!watchAvailable.length ? "w-1/3" : "w-full")}>
          <input
            type="checkbox"
            checked={watchAvailable.length}
            onChange={(e) => {
              form.setValue(`${name}.${day}`, e.target.checked ? [defaultDayRange] : []);
            }}
            className="inline-block rounded-sm border-gray-300 text-neutral-900 focus:ring-neutral-500"
          />
          <span className="ml-2 inline-block text-sm capitalize">{weekday}</span>
        </div>
        {!watchAvailable.length && (
          <div className="flex-grow text-right text-sm text-gray-500 sm:flex-shrink">
            {t("no_availability")}
          </div>
        )}
      </label>
      {!!watchAvailable.length && (
        <div className="flex-grow">
          <DayRanges name={`${name}.${day}`} defaultValue={[]} />
        </div>
      )}
    </fieldset>
  );
};

const Schedule = ({ name }: { name: string }) => {
  const { i18n } = useLocale();
  return (
    <fieldset className="divide-y divide-gray-200">
      {weekdayNames(i18n.language).map((weekday, num) => (
        <ScheduleBlock key={num} name={name} weekday={weekday} day={num} />
      ))}
    </fieldset>
  );
};

export default Schedule;
