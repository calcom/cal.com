import React from "react";
import Text from "@components/ui/Text";
import { PlusIcon, TrashIcon } from "@heroicons/react/outline";
import Dayjs from "dayjs";
import { is24h } from "@lib/clock";
import dayjs from "dayjs";

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

type Props = {
  schedule?: Schedule | null;
  onChange?: (data: Schedule) => void;
  onSubmit: (data: Schedule) => void;
};

export const SCHEDULE_FORM_ID = "SCHEDULE_FORM_ID";
export const toCalendsoAvailabilityFormat = (schedule) => {
  return {};
};

const AM_PM_TIME_FORMAT = `h:mm:ss a`;
const _24_HOUR_TIME_FORMAT = `HH:mm:ss`;

const DEFAULT_START_TIME = "09:00:00";
const DEFAULT_END_TIME = "17:00:00";

const increment = 15;

const TIMES = (() => {
  const starting_time = dayjs().startOf("day");
  const ending_time = dayjs().endOf("day");

  const times = [];
  let t: Dayjs.Dayjs = starting_time;

  while (t.isBefore(ending_time)) {
    times.push(t.format(_24_HOUR_TIME_FORMAT));
    t = t.add(increment, "minutes");
  }
  return times;
})();

const DEFAULT_SCHEDULE = {
  monday: [{ start: "09:00:00", end: "17:00:00" }],
  tuesday: [{ start: "09:00:00", end: "17:00:00" }],
  wednesday: [{ start: "09:00:00", end: "17:00:00" }],
  thursday: [{ start: "09:00:00", end: "17:00:00" }],
  friday: [{ start: "09:00:00", end: "17:00:00" }],
  saturday: null,
  sunday: null,
};

const Scheduler = ({ schedule = DEFAULT_SCHEDULE, onChange, onSubmit }: Props | null) => {
  const ref = React.useRef<HTMLFormElement>(null);

  const transformElementsToSchedule = (elements: HTMLFormControlsCollection): Schedule => {
    let schedule = {};
    const formElements = Array.from(elements)
      .map((element) => {
        return element.id;
      })
      .filter((value) => value);

    formElements.forEach((elementId) => {
      /**
       * elementId either {day} or {day.N.start} or {day.N.end}
       * If elementId in DAYS_ARRAY add elementId to scheduleObj
       * then element is the checkbox and can be ignored
       *
       * If elementId starts with a day in DAYS_ARRAY
       * the elementId should be split by "." resulting in array length 3
       * [day, rangeIndex, "start" | "end"]
       */

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

  const handleSubmit = (event) => {
    event.preventDefault();
    const elements = ref.current.elements;
    const schedule = transformElementsToSchedule(elements);
    onSubmit && typeof onSubmit === "function" && onSubmit(schedule);
  };

  const ScheduleBlock = ({ day, ranges: defaultRanges, selected: defaultSelected }) => {
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
      setSelected(!selected);
      if (!ranges || ranges.length === 0) {
        setRanges([
          {
            start: "09:00:00",
            end: "17:00:00",
          },
        ]);
      }
    };
    /**
     * @param day
     */
    const handleDuplicateSchedule = (day) => {
      console.log(`Duplicate schedule from ${day}`);
    };

    /**
     *
     * @param day
     */
    const handleAddRange = (day) => {
      let rangeToAdd;
      console.log(ranges);
      if (!ranges || ranges?.length === 0) {
        rangeToAdd = {
          start: DEFAULT_START_TIME,
          end: DEFAULT_END_TIME,
        };
        setRanges([rangeToAdd]);
      } else {
        const lastRange = ranges[ranges.length - 1];

        const [hour, minute, second] = lastRange.end.split(":");
        const date = dayjs().set("hour", hour).set("minute", minute).set("second", second);

        const nextStartTime = date.add(1, "hour").format(_24_HOUR_TIME_FORMAT);
        const nextEndTime = date.add(2, "hour").format(_24_HOUR_TIME_FORMAT);

        rangeToAdd = {
          start: nextStartTime,
          end: nextEndTime,
        };
        setRanges([...ranges, rangeToAdd]);
      }
    };

    /**
     *
     * @param day
     * @param range
     */
    const handleDeleteRange = (day, range) => {
      setRanges(
        ranges.filter((r) => {
          return r.start != range.start;
        })
      );
    };

    const TimeRangeField = ({ selected, range, control, register, day, index }) => {
      return (
        <div key={`${day}-range-${index}`} className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <select
              id={`${day}.${index}.start`}
              name={`${day}.${index}.start`}
              defaultValue={range?.start || DEFAULT_START_TIME}
              className="block px-4 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-sm">
              {TIMES.map((time) => {
                return (
                  <option key={`${day}.${index}.start.${time}`} value={time}>
                    {time}
                  </option>
                );
              })}
            </select>
            <Text>-</Text>
            <select
              id={`${day}.${index}.end`}
              name={`${day}.${index}.end`}
              defaultValue={range?.end || DEFAULT_END_TIME}
              className=" block px-4 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-sm">
              {TIMES.map((time) => {
                return (
                  <option key={`${day}.${index}.end.${time}`} value={time}>
                    {time}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="">
            <DeleteAction day={day} range={range} />
          </div>
        </div>
      );
    };

    const Actions = ({ day }) => {
      return (
        <div className="flex items-center space-x-2">
          <button type="button" onClick={() => handleAddRange(day)}>
            <PlusIcon className="h-4 w-4 text-neutral-400 group-hover:text-neutral-500" />
          </button>
        </div>
      );
    };

    const DeleteAction = ({ day, range }) => {
      return (
        <button type="button" onClick={() => handleDeleteRange(day, range)}>
          <TrashIcon className="h-4 w-4 text-neutral-400 group-hover:text-neutral-500" />
        </button>
      );
    };

    return (
      <fieldset className=" py-6">
        <section className="flex flex-col space-y-6 sm:space-y-0 sm:flex-row  sm:items-start sm:justify-between ">
          <div className="flex items-center justify-between testing-w">
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
              <Actions day={day} />
            </div>
          </div>

          <div className="space-y-2">
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

          <div className="hidden sm:block">
            <Actions day={day} />
          </div>
        </section>
      </fieldset>
    );
  };

  return (
    <>
      <form id={SCHEDULE_FORM_ID} onSubmit={handleSubmit} ref={ref} className="divide-y divide-gray-200">
        {Object.keys(schedule).map((day) => {
          const selected = schedule[day] != null;
          return <ScheduleBlock key={`${day}`} day={day} ranges={schedule[day]} selected={selected} />;
        })}
      </form>
    </>
  );
};

export default Scheduler;
