import { ClockIcon } from "@heroicons/react/outline";
import { useRef } from "react";

export default function SetTimesModal(props) {
  const [startHours, startMinutes] = [Math.floor(props.startTime / 60), props.startTime % 60];
  const [endHours, endMinutes] = [Math.floor(props.endTime / 60), props.endTime % 60];

  const startHoursRef = useRef<HTMLInputElement>();
  const startMinsRef = useRef<HTMLInputElement>();
  const endHoursRef = useRef<HTMLInputElement>();
  const endMinsRef = useRef<HTMLInputElement>();

  function updateStartEndTimesHandler(event) {
    event.preventDefault();

    const enteredStartHours = parseInt(startHoursRef.current.value);
    const enteredStartMins = parseInt(startMinsRef.current.value);
    const enteredEndHours = parseInt(endHoursRef.current.value);
    const enteredEndMins = parseInt(endMinsRef.current.value);

    props.onChange({
      startTime: enteredStartHours * 60 + enteredStartMins,
      endTime: enteredEndHours * 60 + enteredEndMins,
    });

    props.onExit(0);
  }

  return (
    <div
      className="fixed z-50 inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex items-end justify-center pb-20 pt-4 px-4 min-h-screen text-center sm:block sm:p-0">
        <div
          className="fixed z-0 inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom pb-4 pt-5 px-4 text-left bg-white rounded-lg shadow-xl overflow-hidden transform transition-all sm:align-middle sm:my-8 sm:p-6 sm:w-full sm:max-w-lg">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="flex flex-shrink-0 items-center justify-center mx-auto w-12 h-12 bg-blue-100 rounded-full sm:mx-0 sm:w-10 sm:h-10">
              <ClockIcon className="w-6 h-6 text-black" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-title">
                Change when you are available for bookings
              </h3>
              <div>
                <p className="text-gray-500 text-sm">Set your work schedule</p>
              </div>
            </div>
          </div>
          <div className="flex mb-4">
            <label className="block pt-2 w-1/4 text-gray-700 text-sm font-medium">Start time</label>
            <div>
              <label htmlFor="startHours" className="sr-only">
                Hours
              </label>
              <input
                ref={startHoursRef}
                type="number"
                min="0"
                max="23"
                maxLength="2"
                name="hours"
                id="startHours"
                className="block w-full focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm"
                placeholder="9"
                defaultValue={startHours}
              />
            </div>
            <span className="mx-2 pt-1">:</span>
            <div>
              <label htmlFor="startMinutes" className="sr-only">
                Minutes
              </label>
              <input
                ref={startMinsRef}
                type="number"
                min="0"
                max="59"
                step="15"
                maxLength="2"
                name="minutes"
                id="startMinutes"
                className="block w-full focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm"
                placeholder="30"
                defaultValue={startMinutes}
              />
            </div>
          </div>
          <div className="flex">
            <label className="block pt-2 w-1/4 text-gray-700 text-sm font-medium">End time</label>
            <div>
              <label htmlFor="endHours" className="sr-only">
                Hours
              </label>
              <input
                ref={endHoursRef}
                type="number"
                min="0"
                max="24"
                maxLength="2"
                name="hours"
                id="endHours"
                className="block w-full focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm"
                placeholder="17"
                defaultValue={endHours}
              />
            </div>
            <span className="mx-2 pt-1">:</span>
            <div>
              <label htmlFor="endMinutes" className="sr-only">
                Minutes
              </label>
              <input
                ref={endMinsRef}
                type="number"
                min="0"
                max="59"
                maxLength="2"
                step="15"
                name="minutes"
                id="endMinutes"
                className="block w-full focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm"
                placeholder="30"
                defaultValue={endMinutes}
              />
            </div>
          </div>
          <div className="mt-5 sm:flex sm:flex-row-reverse sm:mt-4">
            <button onClick={updateStartEndTimesHandler} type="submit" className="btn btn-primary">
              Save
            </button>
            <button onClick={props.onExit} type="button" className="btn btn-white mr-2">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
