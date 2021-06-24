import React, { useEffect, useState } from "react";
import TimezoneSelect from "react-timezone-select";
import { TrashIcon } from "@heroicons/react/outline";
import { WeekdaySelect } from "./WeekdaySelect";
import SetTimesModal from "./modal/SetTimesModal";
import Schedule from "../../lib/schedule.model";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

export const Scheduler = (props) => {
  const [schedules, setSchedules]: Schedule[] = useState(
    props.schedules.map((schedule) => {
      const startDate = schedule.isOverride
        ? dayjs(schedule.startDate)
        : dayjs.utc().startOf("day").add(schedule.startTime, "minutes").tz(props.timeZone);
      return {
        days: schedule.days,
        startDate,
        endDate: startDate.add(schedule.length, "minutes"),
      };
    })
  );

  const [timeZone, setTimeZone] = useState(props.timeZone);
  const [editSchedule, setEditSchedule] = useState(-1);

  useEffect(() => {
    props.onChange(schedules);
  }, [schedules]);

  const addNewSchedule = () => setEditSchedule(schedules.length);

  const applyEditSchedule = (changed: Schedule) => {
    const replaceWith = {
      ...schedules[editSchedule],
      ...changed,
    };

    schedules.splice(editSchedule, 1, replaceWith);

    setSchedules([].concat(schedules));
  };

  const removeScheduleAt = (toRemove: number) => {
    schedules.splice(toRemove, 1);
    setSchedules([].concat(schedules));
  };

  const setWeekdays = (idx: number, days: number[]) => {
    schedules[idx].days = days;
    setSchedules([].concat(schedules));
  };

  return (
    <div>
      <div className="rounded border flex">
        <div className="w-3/5">
          <div className="w-3/4 p-2">
            <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <div className="mt-1">
              <TimezoneSelect
                id="timeZone"
                value={timeZone}
                onChange={setTimeZone}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
          <ul>
            {schedules.map((schedule, idx) => (
              <li key={idx} className="py-2 flex justify-between border-t">
                <div className="inline-flex ml-2">
                  <WeekdaySelect
                    defaultValue={schedules[idx].days}
                    onSelect={(days: number[]) => setWeekdays(idx, days)}
                  />
                  <button className="ml-2 text-sm px-2" type="button" onClick={() => setEditSchedule(idx)}>
                    {dayjs(schedule.startDate).format(schedule.startDate.minute() === 0 ? "ha" : "h:mma")}{" "}
                    until {dayjs(schedule.endDate).format(schedule.endDate.minute() === 0 ? "ha" : "h:mma")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeScheduleAt(idx)}
                  className="btn-sm bg-transparent px-2 py-1 ml-1">
                  <TrashIcon className="h-6 w-6 inline text-gray-400 -mt-1" />
                </button>
              </li>
            ))}
          </ul>
          <hr />
          <button type="button" onClick={addNewSchedule} className="btn-white btn-sm m-2">
            Add another
          </button>
        </div>
        <div className="border-l p-2 w-2/5 text-sm bg-gray-50">
          {/*<p className="font-bold mb-2">Add date overrides</p>
          <p className="mb-2">
            Add dates when your availability changes from your weekly hours
          </p>
          <button className="btn-sm btn-white">Add a date override</button>*/}
        </div>
      </div>
      {editSchedule >= 0 && (
        <SetTimesModal
          schedule={schedules[editSchedule]}
          onChange={applyEditSchedule}
          onExit={() => setEditSchedule(-1)}
        />
      )}
      {/*{showDateOverrideModal &&
        <DateOverrideModal />
      }*/}
    </div>
  );
};
