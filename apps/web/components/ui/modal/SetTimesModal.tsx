import { ClockIcon } from "@heroicons/react/outline";
import { useRef } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";

import Button from "@components/ui/Button";

interface SetTimesModalProps {
  startTime: number;
  endTime: number;
  onChange: (times: { startTime: number; endTime: number }) => void;
  onExit: (...p: unknown[]) => void;
}

export default function SetTimesModal(props: SetTimesModalProps) {
  const { t } = useLocale();
  const [startHours, startMinutes] = [Math.floor(props.startTime / 60), props.startTime % 60];
  const [endHours, endMinutes] = [Math.floor(props.endTime / 60), props.endTime % 60];
  const startHoursRef = useRef<HTMLInputElement>(null!);
  const startMinsRef = useRef<HTMLInputElement>(null!);
  const endHoursRef = useRef<HTMLInputElement>(null!);
  const endMinsRef = useRef<HTMLInputElement>(null!);

  const isValidTime = (startTime: number, endTime: number) => {
    if (new Date(startTime) > new Date(endTime)) {
      showToast(t("error_end_time_before_start_time"), "error");
      return false;
    }
    if (endTime > 1440) {
      showToast(t("error_end_time_next_day"), "error");
      return false;
    }
    return true;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <ClockIcon className="h-6 w-6 text-black" />
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
          <div className="mb-4 flex">
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
                maxLength={2}
                name="hours"
                id="startHours"
                className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
                placeholder="9"
                defaultValue={startHours}
              />
            </div>
            <span className="mx-2 pt-1">:</span>
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
                maxLength={2}
                name="minutes"
                id="startMinutes"
                className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
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
                maxLength={2}
                name="hours"
                id="endHours"
                className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
                placeholder="17"
                defaultValue={endHours}
              />
            </div>
            <span className="mx-2 pt-1">:</span>
            <div>
              <label htmlFor="endMinutes" className="sr-only">
                {t("minutes")}
              </label>
              <input
                ref={endMinsRef}
                type="number"
                min="0"
                max="59"
                maxLength={2}
                step="15"
                name="minutes"
                id="endMinutes"
                className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
                placeholder="30"
                defaultValue={endMinutes}
              />
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button
              onClick={(event) => {
                event.preventDefault();

                const enteredStartHours = parseInt(startHoursRef.current.value);
                const enteredStartMins = parseInt(startMinsRef.current.value);
                const enteredEndHours = parseInt(endHoursRef.current.value);
                const enteredEndMins = parseInt(endMinsRef.current.value);

                if (
                  isValidTime(
                    enteredStartHours * 60 + enteredStartMins,
                    enteredEndHours * 60 + enteredEndMins
                  )
                ) {
                  props.onChange({
                    startTime: enteredStartHours * 60 + enteredStartMins,
                    endTime: enteredEndHours * 60 + enteredEndMins,
                  });
                  props.onExit(0);
                }
              }}
              type="submit">
              {t("save")}
            </Button>
            <Button onClick={props.onExit} type="button" color="secondary" className="ltr:mr-2">
              {t("cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
