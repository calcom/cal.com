import { PlusIcon, TrashIcon } from "@heroicons/react/outline";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { useCallback, useState, useEffect } from "react";
import { useFormContext, Controller, useFieldArray, UseFieldArrayReturn } from "react-hook-form";

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

function dayOfWeekAsString(day: number, weekday: "long" | "short" = "long") {
  return new Date(1970, 0, day + 4).toLocaleString("en", { weekday });
}

export type FreeBusyTime = TimeRange[];
export type Schedule = TimeRange[][];

type TimeRangeFieldProps = {
  name: string;
  defaultValue?: TimeRange;
};

const TimeRangeField = ({ name, defaultValue }: TimeRangeFieldProps) => {
  const { control } = useFormContext();
  const [range, setRange] = useState<TimeRange>(defaultValue);

  const timeOptions = useCallback((offsetOrLimit: { offset?: Dayjs; limit?: Dayjs } = {}) => {
    const { limit, offset } = offsetOrLimit;
    return TIMES.filter((time) => (!limit || time.isBefore(limit)) && (!offset || time.isAfter(offset))).map(
      (time) => ({
        value: time.format(_24_HOUR_TIME_FORMAT),
        label: time.toDate().toLocaleTimeString("nl-NL", { minute: "numeric", hour: "numeric" }),
      })
    );
  }, []);

  const handleOnChange = (onChangeCallback, value) => {
    setRange(value);
    onChangeCallback(value);
  };

  return (
    <div className="flex items-center space-x-2">
      <Controller
        name={name}
        control={control}
        defaultValue={range}
        render={({ field: { onChange, value } }) => (
          <>
            <Select
              className="w-[5.5rem]"
              name={`${name}.start`}
              options={timeOptions({ limit: value?.end })}
              defaultValue={timeOptions().find(
                (option) => option.value === value?.start.format(_24_HOUR_TIME_FORMAT)
              )}
              onChange={(e) =>
                handleOnChange(onChange, { ...value, start: dayjs(e.value, _24_HOUR_TIME_FORMAT, true) })
              }
            />
            <span>-</span>
            <Select
              className="w-[5.5rem]"
              name={`${name}.end`}
              options={timeOptions({ offset: value?.start })}
              defaultValue={timeOptions().find(
                (option) => option.value === value?.end.format(_24_HOUR_TIME_FORMAT)
              )}
              onChange={(e) =>
                handleOnChange(onChange, { ...value, end: dayjs(e.value, _24_HOUR_TIME_FORMAT, true) })
              }
            />
          </>
        )}
      />
    </div>
  );
};

TimeRangeField.displayName = "TimeRangeField";

const ScheduleBlock = ({ name, day, dayRanges }) => {
  const [lastRange, setLastRange] = useState<TimeRange>(null);

  const handleAppend = () => {
    const nextRange = {
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

  const { register, setValue } = useFormContext();

  useEffect(() => {
    setValue(`${name}.${day}`, dayRanges);
  }, [setValue, name, day, dayRanges]);

  // const [ranges, dispatch] = useReducer(reducer, dayRanges);
  const { fields, append, remove, replace } = useFieldArray<UseFieldArrayReturn>({
    name: `${name}.${day}`,
  });

  // make sure the last range always points to the last range
  if (fields.length && (!lastRange || !fields[fields.length - 1].start.isSame(lastRange.start))) {
    setLastRange(fields[fields.length - 1]);
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
          <span className="inline-block">{dayOfWeekAsString(day)}</span>
        </label>
      </div>
      <div className="flex-grow">
        {fields.map((field, index) => (
          <div className="flex justify-between mb-2" key={index}>
            <TimeRangeField key={field.id} {...register(`${name}.${day}.${index}` as const)} />
            <Button
              size="icon"
              color="minimal"
              StartIcon={TrashIcon}
              type="button"
              onClick={() => remove(index)}
            />
          </div>
        ))}
        {!fields.length && "Unavailable"}
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

const Schedule = ({ name, defaultValue = DEFAULT_SCHEDULE }: { name: string; defaultValue?: Schedule }) => {
  return (
    <fieldset className="divide-y divide-gray-200">
      {[...Array(7).keys()].map((day) => (
        <ScheduleBlock name={name} key={day} day={day} dayRanges={defaultValue[day]} />
      ))}
    </fieldset>
  );
};

export default Schedule;
