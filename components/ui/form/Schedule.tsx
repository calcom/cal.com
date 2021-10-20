import { PlusIcon, TrashIcon } from "@heroicons/react/outline";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { useCallback, useState, useEffect } from "react";
import { useFormContext, Controller, useFieldArray } from "react-hook-form";

import { weekdayNames } from "@lib/core/i18n/weekday";
import { useLocale } from "@lib/hooks/useLocale";

import Button from "@components/ui/Button";
import Select from "@components/ui/form/Select";

dayjs.extend(customParseFormat);

export const _24_HOUR_TIME_FORMAT = `HH:mm:ss`;
/** Begin Time Increments For Select */
const increment = 15;
/**
 * Creates an array of times on a 15 minute interval from
 * 00:00:00 (Start of day) to
 * 23:45:00 (End of day with enough time for 15 min booking)
 */
const TIMES = (() => {
  const end = dayjs().endOf("day");
  let t: Dayjs = dayjs().startOf("day");

  const times = [];
  while (t.isBefore(end)) {
    times.push(t);
    t = t.add(increment, "minutes");
  }
  return times;
})();
/** End Time Increments For Select */

const defaultDayRange: TimeRange = {
  start: dayjs("09:00:00", _24_HOUR_TIME_FORMAT, true),
  end: dayjs("17:00:00", _24_HOUR_TIME_FORMAT, true),
};

const DEFAULT_SCHEDULE: Schedule = [
  [],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [],
];

export type TimeRange = {
  start: Dayjs;
  end: Dayjs;
};

export type FreeBusyTime = TimeRange[];
export type Schedule = TimeRange[][];

type TimeRangeFieldProps = {
  name: string;
  defaultValue?: TimeRange;
};

const TimeRangeField = ({ name, defaultValue }: TimeRangeFieldProps) => {
  const { control } = useFormContext();
  const [range, setRange] = useState<TimeRange | null>(defaultValue || null);

  const timeOptions = useCallback((offsetOrLimit: { offset?: Dayjs; limit?: Dayjs } = {}) => {
    const { limit, offset } = offsetOrLimit;
    return TIMES.filter((time) => (!limit || time.isBefore(limit)) && (!offset || time.isAfter(offset))).map(
      (time) => ({
        value: time.format(_24_HOUR_TIME_FORMAT),
        label: time.toDate().toLocaleTimeString("nl-NL", { minute: "numeric", hour: "numeric" }),
      })
    );
  }, []);

  const handleOnChange = (onChangeCallback: (...event: unknown[]) => void, value: TimeRange) => {
    setRange(value);
    onChangeCallback(value);
  };

  return (
    <div className="flex items-center space-x-2">
      <Controller
        name={name}
        control={control}
        defaultValue={range}
        render={({ field }) => (
          <>
            <Select
              className="w-[5.5rem]"
              name={`${name}.start`}
              options={timeOptions({ limit: field.value?.end })}
              defaultValue={timeOptions().find(
                (option) => option.value === dayjs(field.value?.start).format(_24_HOUR_TIME_FORMAT)
              )}
              onChange={(e) => {
                if (!e?.value) return;
                return handleOnChange(field.onChange, {
                  ...field.value,
                  start: dayjs(e.value, _24_HOUR_TIME_FORMAT, true),
                });
              }}
            />
            <span>-</span>
            <Select
              className="w-[5.5rem]"
              name={`${name}.end`}
              options={timeOptions({ offset: field.value?.start })}
              defaultValue={timeOptions().find(
                (option) => option.value === dayjs(field.value?.end).format(_24_HOUR_TIME_FORMAT)
              )}
              onChange={(e) => {
                if (!e?.value) return;
                return handleOnChange(field.onChange, {
                  ...field.value,
                  end: dayjs(e.value, _24_HOUR_TIME_FORMAT, true),
                });
              }}
            />
          </>
        )}
      />
    </div>
  );
};

TimeRangeField.displayName = "TimeRangeField";

type ScheduleBlockProps = {
  day: number;
  weekday: string;
  name: string;
  dayRanges: TimeRange[];
};

const ScheduleBlock = ({ name, day, weekday, dayRanges }: ScheduleBlockProps) => {
  const [lastRange, setLastRange] = useState<TimeRange>();
  const { t } = useLocale();

  const handleAppend = () => {
    const nextRange: TimeRange = {
      start: lastRange.end,
      end: lastRange.end.add(1, "hour"),
    };
    // Return if next range goes over into "tomorrow"
    if (nextRange.start.isAfter(lastRange.start.endOf("day"))) {
      return;
    }
    // update last range with nextRange
    setLastRange(nextRange);

    return append(nextRange);
  };

  const { register, setValue, control } = useFormContext();

  useEffect(() => {
    if (dayRanges) {
      setValue(`${name}.${day}`, dayRanges);
    }
  }, [setValue, name, day, dayRanges]);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: `${name}.${day}`,
  });

  // make sure the last range always points to the last range
  if (fields.length && (!lastRange || !dayjs(fields[fields.length - 1].start).isSame(lastRange.start))) {
    setLastRange({
      start: dayjs(fields[fields.length - 1].start),
      end: dayjs(fields[fields.length - 1].end),
    });
  }

  return (
    <fieldset className="flex justify-between py-5">
      <div className="w-1/3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={fields.length > 0}
            onChange={(e) => (e.target.checked ? replace([defaultDayRange]) : replace([]))}
            className="inline-block border-gray-300 rounded-sm focus:ring-neutral-500 text-neutral-900"
          />
          <span className="inline-block capitalize">{weekday}</span>
        </label>
      </div>
      <div className="flex-grow">
        {fields.map((field, index) => (
          <div className="flex justify-between mb-2" key={index}>
            <TimeRangeField
              key={field.id}
              defaultValue={field}
              {...register(`${name}.${day}.${index}` as const)}
            />
            <Button
              size="icon"
              color="minimal"
              StartIcon={TrashIcon}
              type="button"
              onClick={() => remove(index)}
            />
          </div>
        ))}
        {!fields.length && t("no_availability")}
      </div>
      <div>
        <Button
          type="button"
          color="minimal"
          size="icon"
          className={fields.length > 0 ? "visible" : "invisible"}
          StartIcon={PlusIcon}
          onClick={handleAppend}
        />
      </div>
    </fieldset>
  );
};

type ScheduleProps = {
  name: string;
  defaultValue?: Schedule;
};

const Schedule = ({ name, defaultValue = DEFAULT_SCHEDULE }: ScheduleProps) => {
  const { i18n } = useLocale();
  return (
    <fieldset className="divide-y divide-gray-200">
      {weekdayNames(i18n.language).map((weekday, num) => (
        <ScheduleBlock key={num} name={name} weekday={weekday} day={num} dayRanges={defaultValue[num]} />
      ))}
    </fieldset>
  );
};

export default Schedule;
