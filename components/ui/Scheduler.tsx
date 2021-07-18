import React, { useEffect, useState } from "react";
import TimezoneSelect from "react-timezone-select";
import { TrashIcon } from "@heroicons/react/outline";
import { WeekdaySelect } from "./WeekdaySelect";
import SetTimesModal from "./modal/SetTimesModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Availability } from "@prisma/client";

dayjs.extend(utc);
dayjs.extend(timezone);

type Props = {
  timeZone: string;
  availability: Availability[];
  setTimeZone: unknown;
};

export const Scheduler = ({
  availability,
  setAvailability,
  timeZone: selectedTimeZone,
  setTimeZone,
}: Props) => {
  const [editSchedule, setEditSchedule] = useState(-1);
  const [dateOverrides, setDateOverrides] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);

  useEffect(() => {
    setOpeningHours(
      availability
        .filter((item: Availability) => item.days.length !== 0)
        .map((item) => {
          item.startDate = dayjs().utc().startOf("day").add(item.startTime, "minutes");
          item.endDate = dayjs().utc().startOf("day").add(item.endTime, "minutes");
          return item;
        })
    );
    setDateOverrides(availability.filter((item: Availability) => item.date));
  }, []);

  // updates availability to how it should be formatted outside this component.
  useEffect(() => {
    setAvailability({
      dateOverrides: dateOverrides,
      openingHours: openingHours,
    });
  }, [dateOverrides, openingHours]);

  const addNewSchedule = () => setEditSchedule(openingHours.length);

  const applyEditSchedule = (changed) => {
    // new entry
    if (!changed.days) {
      changed.days = [1, 2, 3, 4, 5]; // Mon - Fri
      setOpeningHours(openingHours.concat(changed));
    } else {
      // update
      const replaceWith = { ...openingHours[editSchedule], ...changed };
      openingHours.splice(editSchedule, 1, replaceWith);
      setOpeningHours([].concat(openingHours));
    }
  };

  const removeScheduleAt = (toRemove: number) => {
    openingHours.splice(toRemove, 1);
    setOpeningHours([].concat(openingHours));
  };

  const OpeningHours = ({ idx, item }) => (
    <li className="py-2 flex justify-between border-t">
      <div className="flex flex-col space-y-4 lg:inline-flex ml-2 ">
        <WeekdaySelect defaultValue={item.days} onSelect={(selected: number[]) => (item.days = selected)} />
        <button className="ml-2 text-sm px-2" type="button" onClick={() => setEditSchedule(idx)}>
          {dayjs()
            .startOf("day")
            .add(item.startTime, "minutes")
            .format(item.startTime % 60 === 0 ? "ha" : "h:mma")}
          &nbsp;until&nbsp;
          {dayjs()
            .startOf("day")
            .add(item.endTime, "minutes")
            .format(item.endTime % 60 === 0 ? "ha" : "h:mma")}
        </button>
      </div>
      <button
        type="button"
        onClick={() => removeScheduleAt(idx)}
        className="btn-sm bg-transparent px-2 py-1 ml-1">
        <TrashIcon className="h-6 w-6 inline text-gray-400 -mt-1" />
      </button>
    </li>
  );

  return (
    <div>
      <div className="rounded border flex">
        <div className="w-full">
          <div className=" p-2">
            <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <div className="mt-1">
              <TimezoneSelect
                id="timeZone"
                value={selectedTimeZone}
                onChange={(tz) => setTimeZone(tz.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
          <ul>
            {openingHours.map((item, idx) => (
              <OpeningHours key={idx} idx={idx} item={item} />
            ))}
          </ul>
          <hr />
          <button type="button" onClick={addNewSchedule} className="btn-white btn-sm m-2">
            Add another
          </button>
        </div>
      </div>
      {editSchedule >= 0 && (
        <SetTimesModal
          startTime={openingHours[editSchedule] ? openingHours[editSchedule].startTime : 540}
          endTime={openingHours[editSchedule] ? openingHours[editSchedule].endTime : 1020}
          onChange={(times) => applyEditSchedule({ ...(openingHours[editSchedule] || {}), ...times })}
          onExit={() => setEditSchedule(-1)}
        />
      )}
    </div>
  );
};
