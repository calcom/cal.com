import { convertMinsToHrsMins } from "@lib/time";

import React, { useRef } from "react";
import { updateUserAvailability } from "../mutations/updateUserAvailability";

const AVAILABLE_TIMES_FORM_ID = "AVAILABLE_TIMES_FORM";
// { startTime, endTime, bufferTime }, { externallySubmitted }
type Values = {
  startTime: unknown;
  endTime: unknown;
  bufferTime: unknown;
};

type Options = {
  externallySubmitted: boolean;
};

type Props = {
  // values: Values
  // options: Options
  startTime: unknown;
  endTime: unknown;
  bufferTime: unknown;
  externallySubmitted?: boolean;
};
const AvailableTimes = React.forwardRef<HTMLFormElement, Props>((props, ref) => {
  const { startTime, endTime, bufferTime } = props;

  const startHoursRef = useRef<HTMLInputElement>();
  const startMinsRef = useRef<HTMLInputElement>();
  const endHoursRef = useRef<HTMLInputElement>();
  const endMinsRef = useRef<HTMLInputElement>();
  const bufferHoursRef = useRef<HTMLInputElement>();
  const bufferMinsRef = useRef<HTMLInputElement>();

  async function updateStartEndTimesHandler(event) {
    event.preventDefault();

    const enteredStartHours = parseInt(startHoursRef.current.value);
    const enteredStartMins = parseInt(startMinsRef.current.value);
    const enteredEndHours = parseInt(endHoursRef.current.value);
    const enteredEndMins = parseInt(endMinsRef.current.value);
    const enteredBufferHours = parseInt(bufferHoursRef.current.value);
    const enteredBufferMins = parseInt(bufferMinsRef.current.value);

    const startMins = enteredStartHours * 60 + enteredStartMins;
    const endMins = enteredEndHours * 60 + enteredEndMins;
    const bufferMins = enteredBufferHours * 60 + enteredBufferMins;

    try {
      await updateUserAvailability({
        start: startMins,
        end: endMins,
        buffer: bufferMins,
      });
    } catch (reason) {
      console.log(reason);
    }
  }

  return (
    <form id="AVAILABLE_TIMES_FORM_ID" onSubmit={updateStartEndTimesHandler}>
      <div className="flex mb-4">
        <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">Start time</label>
        <div>
          <label htmlFor="hours" className="sr-only">
            Hours
          </label>
          <input
            ref={startHoursRef}
            type="number"
            name="hours"
            id="hours"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="9"
            defaultValue={convertMinsToHrsMins(startTime).split(":")[0]}
          />
        </div>
        <span className="mx-2 pt-1">:</span>
        <div>
          <label htmlFor="minutes" className="sr-only">
            Minutes
          </label>
          <input
            ref={startMinsRef}
            type="number"
            name="minutes"
            id="minutes"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="30"
            defaultValue={convertMinsToHrsMins(startTime).split(":")[1]}
          />
        </div>
      </div>
      <div className="flex mb-4">
        <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">End time</label>
        <div>
          <label htmlFor="hours" className="sr-only">
            Hours
          </label>
          <input
            ref={endHoursRef}
            type="number"
            name="hours"
            id="hours"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="17"
            defaultValue={convertMinsToHrsMins(endTime).split(":")[0]}
          />
        </div>
        <span className="mx-2 pt-1">:</span>
        <div>
          <label htmlFor="minutes" className="sr-only">
            Minutes
          </label>
          <input
            ref={endMinsRef}
            type="number"
            name="minutes"
            id="minutes"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="30"
            defaultValue={convertMinsToHrsMins(endTime).split(":")[1]}
          />
        </div>
      </div>
      <div className="flex mb-4">
        <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">Buffer</label>
        <div>
          <label htmlFor="hours" className="sr-only">
            Hours
          </label>
          <input
            ref={bufferHoursRef}
            type="number"
            name="hours"
            id="hours"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="0"
            defaultValue={convertMinsToHrsMins(bufferTime).split(":")[0]}
          />
        </div>
        <span className="mx-2 pt-1">:</span>
        <div>
          <label htmlFor="minutes" className="sr-only">
            Minutes
          </label>
          <input
            ref={bufferMinsRef}
            type="number"
            name="minutes"
            id="minutes"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="10"
            defaultValue={convertMinsToHrsMins(bufferTime).split(":")[1]}
          />
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button type="submit" className="btn btn-primary">
          Update
        </button>
        <button onClick={() => {}} type="button" className="btn btn-white mr-2">
          Cancel
        </button>
      </div>
    </form>
  );
});

AvailableTimes.displayName = "AvailableTimesForm";

export default AvailableTimes;
