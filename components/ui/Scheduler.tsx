import React, {useEffect, useState} from "react";
import TimezoneSelect from "react-timezone-select";
import {PencilAltIcon, TrashIcon} from "@heroicons/react/outline";
import {WeekdaySelect} from "./WeekdaySelect";
import SetTimesModal from "../modal/SetTimesModal";
import Schedule from '../../lib/schedule.model';
import dayjs, {Dayjs} from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

export const Scheduler = (props) => {

  const [ showSetTimesModal, setShowSetTimesModal ]: boolean = useState(false);
  const [ schedules, setSchedules ]: Schedule[] = useState(
    props.schedules.map( (schedule, idx) => ({
      startDate: dayjs(schedule.startDate),
      endDate: dayjs(schedule.startDate).startOf('day').add(schedule.length, 'minutes'),
      key: idx
    }) )
  );

  const [ timeZone, setTimeZone ] = useState(props.timeZone);
  const [ selectedSchedule, setSelectedSchedule ]: Schedule | null = useState(null);

  const addNewSchedule = () => {
    setSelectedSchedule({
      startDate: dayjs().startOf('day').add(0, 'minutes'),
      endDate: dayjs().startOf('day').add(1439, 'minutes'),
    });
    setShowSetTimesModal(true);
  }

  const upsertSchedule = (changed: Schedule) => {
    if (changed.key) {
      schedules.splice(
        schedules.findIndex( (schedule) => changed.key === schedule.key ), 1, changed
      )
      setSchedules([].concat(schedules)); // update
    }
    else {
      console.log(changed);
      setSchedules(schedules.concat([changed])); // insert
    }
  }

  const removeSchedule = (toRemove: Schedule) => {
    schedules.splice(schedules.findIndex( (schedule) => schedule.key === toRemove.key ), 1);
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
              <TimezoneSelect id="timeZone" value={timeZone} onChange={setTimeZone} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md" />
            </div>
          </div>
          <ul>
            {schedules.length > 0 && schedules.map( (schedule) =>
              <li key={schedule.key} className="py-2 flex justify-between border-t">
              <div className="inline-flex ml-2">
                <WeekdaySelect />
                <button className="ml-2 text-sm px-2" type="button" onClick={() => { setSelectedSchedule(schedule); setShowSetTimesModal(true) }}>
                  {schedule.startDate.format(schedule.startDate.minute() === 0 ? 'ha' : 'h:mma')} until {schedule.endDate.format(schedule.endDate.minute() === 0 ? 'ha' : 'h:mma')}
                </button>
              </div>
              <button type="button" onClick={() => removeSchedule(schedule)}
                      className="btn-sm bg-transparent px-2 py-1 ml-1">
                <TrashIcon className="h-6 w-6 inline text-gray-400 -mt-1"  />
              </button>
            </li>)}
          </ul>
          <hr />
          <button type="button" onClick={addNewSchedule} className="btn-white btn-sm m-2">Add another</button>
        </div>
        <div className="border-l p-2 w-2/5 text-sm bg-gray-50">
          {/*<p className="font-bold mb-2">Add date overrides</p>
          <p className="mb-2">
            Add dates when your availability changes from your weekly hours
          </p>
          <button className="btn-sm btn-white">Add a date override</button>*/}
        </div>
      </div>
      {showSetTimesModal &&
        <SetTimesModal schedule={selectedSchedule}
                       onChange={upsertSchedule}
                       onExit={() => setShowSetTimesModal(false)} />
      }
      {/*{showDateOverrideModal &&
        <DateOverrideModal />
      }*/}
    </div>
  );
}