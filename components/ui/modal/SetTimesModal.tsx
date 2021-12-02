import { ClockIcon } from "@heroicons/react/outline";
import { useRef } from "react";

import { useLocale } from "@lib/hooks/useLocale";

import Button from "@components/ui/Button";

export default function SetTimesModal(props) {
  const { t } = useLocale();
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
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-blue-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
              <ClockIcon className="w-6 h-6 text-black" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {t("change_bookings_availability")}
              </h3>
              <div>
                <p className="text-sm text-gray-500">{t("set_work_schedule")}</p>
              </div>
            </div>
          </div>
          <div className="flex mb-4">
            <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">{t("start_time")}</label>
            <div>
              <label htmlFor="startHours" className="sr-only">
                {t("hours")}
              </label>
              <input
                ref={startHoursRef}
                type="number"
                min="0"
                max="23"
                maxLength="2"
                name="hours"
                id="startHours"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-brand sm:text-sm"
                placeholder="9"
                defaultValue={startHours}
              />
            </div>
            <span className="pt-1 mx-2">:</span>
            <div>
              <label htmlFor="startMinutes" className="sr-only">
                {t("minutes")}
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
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-brand sm:text-sm"
                placeholder="30"
                defaultValue={startMinutes}
              />
            </div>
          </div>
          <div className="flex">
            <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">{t("end_time")}</label>
            <div>
              <label htmlFor="endHours" className="sr-only">
                {t("hours")}
              </label>
              <input
                ref={endHoursRef}
                type="number"
                min="0"
                max="24"
                maxLength="2"
                name="hours"
                id="endHours"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-brand sm:text-sm"
                placeholder="17"
                defaultValue={endHours}
              />
            </div>
            <span className="pt-1 mx-2">:</span>
            <div>
              <label htmlFor="endMinutes" className="sr-only">
                {t("minutes")}
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
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-brand sm:text-sm"
                placeholder="30"
                defaultValue={endMinutes}
              />
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button onClick={updateStartEndTimesHandler} type="submit">
              {t("save")}
            </Button>
            <Button onClick={props.onExit} type="button" color="secondary" className="mr-2">
              {t("cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
