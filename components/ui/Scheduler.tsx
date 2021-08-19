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
    <li className="flex justify-between py-2 border-b">
      <div className="flex flex-col space-y-4 lg:inline-flex">
        <WeekdaySelect defaultValue={item.days} onSelect={(selected: number[]) => (item.days = selected)} />
        <button
          className="px-3 py-2 text-sm bg-neutral-100 rounded-sm"
          type="button"
          onClick={() => setEditSchedule(idx)}>
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
        className="btn-sm ml-1 px-2 py-1 bg-transparent">
        <TrashIcon className="inline -mt-1 w-5 h-5 text-gray-400" />
      </button>
    </li>
  );

  return (
    <div>
      <div className="flex">
        <div className="w-full">
          <div className="">
            <label htmlFor="timeZone" className="block text-gray-700 text-sm font-medium">
              Timezone
            </label>
            <div className="mt-1">
              <TimezoneSelect
                id="timeZone"
                value={selectedTimeZone}
                onChange={(tz) => setTimeZone(tz.value)}
                className="block mt-1 w-full focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm"
              />
            </div>
          </div>
          <ul>
            {openingHours.map((item, idx) => (
              <OpeningHours key={idx} idx={idx} item={item} />
            ))}
          </ul>
          <button type="button" onClick={addNewSchedule} className="btn-white btn-sm mt-2">
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
