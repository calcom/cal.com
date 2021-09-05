import React from "react";
import Text from "@components/ui/Text";
import { PlusIcon, TrashIcon } from "@heroicons/react/outline";
import dayjs, { Dayjs } from "dayjs";
import classnames from "classnames";
export const SCHEDULE_FORM_ID = "SCHEDULE_FORM_ID";
export const toCalendsoAvailabilityFormat = (schedule: Schedule) => {
  return schedule;
};

export const _24_HOUR_TIME_FORMAT = `HH:mm:ss`;

const DEFAULT_START_TIME = "09:00:00";
const DEFAULT_END_TIME = "17:00:00";

/** Begin Time Increments For Select */
const increment = 15;

/**
 * Creates an array of times on a 15 minute interval from
 * 00:00:00 (Start of day) to
 * 23:45:00 (End of day with enough time for 15 min booking)
 */
const TIMES = (() => {
  const starting_time = dayjs().startOf("day");
  const ending_time = dayjs().endOf("day");

  const times = [];
  let t: Dayjs = starting_time;

  while (t.isBefore(ending_time)) {
    times.push(t);
    t = t.add(increment, "minutes");
  }
  return times;
})();
/** End Time Increments For Select */

const DEFAULT_SCHEDULE: Schedule = {
  monday: [{ start: "09:00:00", end: "17:00:00" }],
  tuesday: [{ start: "09:00:00", end: "17:00:00" }],
  wednesday: [{ start: "09:00:00", end: "17:00:00" }],
  thursday: [{ start: "09:00:00", end: "17:00:00" }],
  friday: [{ start: "09:00:00", end: "17:00:00" }],
  saturday: null,
  sunday: null,
};

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type TimeRange = {
  start: string;
  end: string;
};

export type FreeBusyTime = TimeRange[];

export type Schedule = {
  monday?: FreeBusyTime | null;
  tuesday?: FreeBusyTime | null;
  wednesday?: FreeBusyTime | null;
  thursday?: FreeBusyTime | null;
  friday?: FreeBusyTime | null;
  saturday?: FreeBusyTime | null;
  sunday?: FreeBusyTime | null;
};

type ScheduleBlockProps = {
  day: DayOfWeek;
  ranges?: FreeBusyTime | null;
  selected?: boolean;
};

type Props = {
  schedule?: Schedule;
  onChange?: (data: Schedule) => void;
  onSubmit: (data: Schedule) => void;
};

const SchedulerForm = ({ schedule = DEFAULT_SCHEDULE, onSubmit }: Props) => {
  const ref = React.useRef<HTMLFormElement>(null);

  const transformElementsToSchedule = (elements: HTMLFormControlsCollection): Schedule => {
    const schedule: Schedule = {};
    const formElements = Array.from(elements)
      .map((element) => {
        return element.id;
      })
      .filter((value) => value);

    /**
     * elementId either {day} or {day.N.start} or {day.N.end}
     * If elementId in DAYS_ARRAY add elementId to scheduleObj
     * then element is the checkbox and can be ignored
     *
     * If elementId starts with a day in DAYS_ARRAY
     * the elementId should be split by "." resulting in array length 3
     * [day, rangeIndex, "start" | "end"]
     */
    formElements.forEach((elementId) => {
      const [day, rangeIndex, rangeId] = elementId.split(".");
      if (rangeIndex && rangeId) {
        if (!schedule[day]) {
          schedule[day] = [];
        }

        if (!schedule[day][parseInt(rangeIndex)]) {
          schedule[day][parseInt(rangeIndex)] = {};
        }

        schedule[day][parseInt(rangeIndex)][rangeId] = elements[elementId].value;
      }
    });

    return schedule;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const elements = ref.current?.elements;
    if (elements) {
      const schedule = transformElementsToSchedule(elements);
      onSubmit && typeof onSubmit === "function" && onSubmit(schedule);
    }
  };

  const ScheduleBlock = ({ day, ranges: defaultRanges, selected: defaultSelected }: ScheduleBlockProps) => {
    const [ranges, setRanges] = React.useState(defaultRanges);
    const [selected, setSelected] = React.useState(defaultSelected);
    React.useEffect(() => {
      if (!ranges || ranges.length === 0) {
        setSelected(false);
      } else {
        setSelected(true);
      }
    }, [ranges]);

    const handleSelectedChange = () => {
      if (!selected && (!ranges || ranges.length === 0)) {
        setRanges([
          {
            start: "09:00:00",
            end: "17:00:00",
          },
        ]);
      }
      setSelected(!selected);
    };

    const handleAddRange = () => {
      let rangeToAdd;
      if (!ranges || ranges?.length === 0) {
        rangeToAdd = {
          start: DEFAULT_START_TIME,
          end: DEFAULT_END_TIME,
        };
        setRanges([rangeToAdd]);
      } else {
        const lastRange = ranges[ranges.length - 1];

        const [hour, minute, second] = lastRange.end.split(":");
        const date = dayjs()
          .set("hour", parseInt(hour))
          .set("minute", parseInt(minute))
          .set("second", parseInt(second));
        const nextStartTime = date.add(1, "hour");
        const nextEndTime = date.add(2, "hour");

        /**
         * If next range goes over into "tomorrow"
         * i.e. time greater that last value in Times
         * return
         */
        if (nextStartTime.isAfter(date.endOf("day"))) {
          return;
        }

        rangeToAdd = {
          start: nextStartTime.format(_24_HOUR_TIME_FORMAT),
          end: nextEndTime.format(_24_HOUR_TIME_FORMAT),
        };
        setRanges([...ranges, rangeToAdd]);
      }
    };

    const handleDeleteRange = (range: TimeRange) => {
      if (ranges && ranges.length > 0) {
        setRanges(
          ranges.filter((r: TimeRange) => {
            return r.start != range.start;
          })
        );
      }
    };

    /**
     * Should update ranges values
     */
    const handleSelectRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const [day, rangeIndex, rangeId] = event.currentTarget.name.split(".");

      if (day && ranges) {
        const newRanges = ranges.map((range, index) => {
          const newRange = {
            ...range,
            [rangeId]: event.currentTarget.value,
          };
          return index === parseInt(rangeIndex) ? newRange : range;
        });

        setRanges(newRanges);
      }
    };

    const TimeRangeField = ({ range, day, index }: { range: TimeRange; day: DayOfWeek; index: number }) => {
      const timeOptions = (type: "start" | "end") =>
        TIMES.map((time) => (
          <option
            key={`${day}.${index}.${type}.${time.format(_24_HOUR_TIME_FORMAT)}`}
            value={time.format(_24_HOUR_TIME_FORMAT)}>
            {time.toDate().toLocaleTimeString(undefined, { minute: "numeric", hour: "numeric" })}
          </option>
        ));
      return (
        <div key={`${day}-range-${index}`} className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <select
              id={`${day}.${index}.start`}
              name={`${day}.${index}.start`}
              defaultValue={range?.start || DEFAULT_START_TIME}
              onChange={handleSelectRangeChange}
              className="block px-4 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-sm">
              {timeOptions("start")}
            </select>
            <Text>-</Text>
            <select
              id={`${day}.${index}.end`}
              name={`${day}.${index}.end`}
              defaultValue={range?.end || DEFAULT_END_TIME}
              onChange={handleSelectRangeChange}
              className=" block px-4 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-sm">
              {timeOptions("end")}
            </select>
          </div>
          <div className="">
            <DeleteAction range={range} />
          </div>
        </div>
      );
    };

    const Actions = () => {
      return (
        <div className="flex items-center space-x-2">
          <button type="button" onClick={() => handleAddRange()}>
            <PlusIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-500" />
          </button>
        </div>
      );
    };

    const DeleteAction = ({ range }: { range: TimeRange }) => {
      return (
        <button type="button" onClick={() => handleDeleteRange(range)}>
          <TrashIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-500" />
        </button>
      );
    };

    return (
      <fieldset className=" py-6">
        <section
          className={classnames(
            "flex flex-col space-y-6 sm:space-y-0 sm:flex-row  sm:justify-between",
            ranges && ranges?.length > 1 ? "sm:items-start" : "sm:items-center"
          )}>
          <div style={{ minWidth: "33%" }} className="flex items-center justify-between">
            <div className="flex items-center space-x-2 ">
              <input
                id={day}
                name={day}
                checked={selected}
                onChange={handleSelectedChange}
                type="checkbox"
                className="focus:ring-neutral-500 h-4 w-4 text-neutral-900 border-gray-300 rounded-sm"
              />
              <Text variant="overline">{day}</Text>
            </div>
            <div className="sm:hidden justify-self-end self-end">
              <Actions />
            </div>
          </div>

          <div className="space-y-2 w-full">
            {selected && ranges && ranges.length != 0 ? (
              ranges.map((range, index) => (
                <TimeRangeField key={`${day}-range-${index}`} range={range} index={index} day={day} />
              ))
            ) : (
              <Text key={`${day}`} variant="caption">
                Unavailable
              </Text>
            )}
          </div>

          <div className="hidden sm:block px-2">
            <Actions />
          </div>
        </section>
      </fieldset>
    );
  };

  return (
    <>
      <form id={SCHEDULE_FORM_ID} onSubmit={handleSubmit} ref={ref} className="divide-y divide-gray-200">
        {Object.keys(schedule).map((day) => {
          const selected = schedule[day as DayOfWeek] != null;
          return (
            <ScheduleBlock
              key={`${day}`}
              day={day as DayOfWeek}
              ranges={schedule[day as DayOfWeek]}
              selected={selected}
            />
          );
        })}
      </form>
    </>
  );
};

export default SchedulerForm;
