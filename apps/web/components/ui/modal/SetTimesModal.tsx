import { ClockIcon } from "@heroicons/react/outline";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/Dialog";

dayjs.extend(customParseFormat);

interface SetTimesModalProps {
  isOpen: boolean;
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
  const [endMinuteDisable, setEndMinuteDisable] = useState(false);
  const [maximumStartTime, setMaximumStartTime] = useState({ hour: endHours, minute: 59 });
  const [minimumEndTime, setMinimumEndTime] = useState({ hour: startHours, minute: 59 });

  const STEP = 15;

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

  // compute dynamic range for minimum and maximum allowed hours/minutes.
  const setEdgeTimes = (
    (step) =>
    (
      startHoursRef: React.MutableRefObject<HTMLInputElement>,
      startMinsRef: React.MutableRefObject<HTMLInputElement>,
      endHoursRef: React.MutableRefObject<HTMLInputElement>,
      endMinsRef: React.MutableRefObject<HTMLInputElement>
    ) => {
      //parse all the refs
      const startHour = parseInt(startHoursRef.current.value);
      let startMinute = parseInt(startMinsRef.current.value);
      const endHour = parseInt(endHoursRef.current.value);
      let endMinute = parseInt(endMinsRef.current.value);

      //convert to dayjs object
      const startTime = dayjs(`${startHour}:${startMinute}`, "hh:mm");
      const endTime = dayjs(`${endHour}:${endMinute}`, "hh:mm");

      //compute minimin and maximum allowed
      const maximumStartTime = endTime.subtract(step, "minute");
      const maximumStartHour = maximumStartTime.hour();
      const maximumStartMinute = startHour === endHour ? maximumStartTime.minute() : 59;

      const minimumEndTime = startTime.add(step, "minute");
      const minimumEndHour = minimumEndTime.hour();
      const minimumEndMinute = startHour === endHour ? minimumEndTime.minute() : 0;

      //check allow min/max minutes when the end/start hour matches
      if (startHoursRef.current.value === endHoursRef.current.value) {
        if (parseInt(startMinsRef.current.value) >= maximumStartMinute)
          startMinsRef.current.value = maximumStartMinute.toString();
        if (parseInt(endMinsRef.current.value) <= minimumEndMinute)
          endMinsRef.current.value = minimumEndMinute.toString();
      }

      //save into state
      setMaximumStartTime({ hour: maximumStartHour, minute: maximumStartMinute });
      setMinimumEndTime({ hour: minimumEndHour, minute: minimumEndMinute });
    }
  )(STEP);

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onExit}>
      <DialogContent>
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
          <div className="w-1/6">
            <label htmlFor="startHours" className="sr-only">
              {t("hours")}
            </label>
            <input
              ref={startHoursRef}
              type="number"
              min="0"
              max={maximumStartTime.hour}
              minLength={2}
              name="hours"
              id="startHours"
              className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
              placeholder="9"
              defaultValue={startHours}
              onChange={() => setEdgeTimes(startHoursRef, startMinsRef, endHoursRef, endMinsRef)}
            />
          </div>
          <span className="mx-2 pt-1">:</span>
          <div className="w-1/6">
            <label htmlFor="startMinutes" className="sr-only">
              {t("minutes")}
            </label>
            <input
              ref={startMinsRef}
              type="number"
              min="0"
              max={maximumStartTime.minute}
              step={STEP}
              maxLength={2}
              name="minutes"
              id="startMinutes"
              className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
              placeholder="30"
              defaultValue={startMinutes}
              onChange={() => setEdgeTimes(startHoursRef, startMinsRef, endHoursRef, endMinsRef)}
            />
          </div>
        </div>
        <div className="flex">
          <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">{t("end_time")}</label>
          <div className="w-1/6">
            <label htmlFor="endHours" className="sr-only">
              {t("hours")}
            </label>
            <input
              ref={endHoursRef}
              type="number"
              min={minimumEndTime.hour}
              max="24"
              maxLength={2}
              name="hours"
              id="endHours"
              className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
              placeholder="17"
              defaultValue={endHours}
              onChange={(e) => {
                if (endHoursRef.current.value === "24") endMinsRef.current.value = "0";
                setEdgeTimes(startHoursRef, startMinsRef, endHoursRef, endMinsRef);
                setEndMinuteDisable(endHoursRef.current.value === "24");
              }}
            />
          </div>
          <span className="mx-2 pt-1">:</span>
          <div className="w-1/6">
            <label htmlFor="endMinutes" className="sr-only">
              {t("minutes")}
            </label>
            <input
              ref={endMinsRef}
              type="number"
              min={minimumEndTime.minute}
              max="59"
              maxLength={2}
              step={STEP}
              name="minutes"
              id="endMinutes"
              className="focus:border-brand block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
              placeholder="30"
              defaultValue={endMinutes}
              disabled={endMinuteDisable}
              onChange={() => setEdgeTimes(startHoursRef, startMinsRef, endHoursRef, endMinsRef)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={(event) => {
              event.preventDefault();

              const enteredStartHours = parseInt(startHoursRef.current.value);
              const enteredStartMins = parseInt(startMinsRef.current.value);
              const enteredEndHours = parseInt(endHoursRef.current.value);
              const enteredEndMins = parseInt(endMinsRef.current.value);

              if (
                isValidTime(enteredStartHours * 60 + enteredStartMins, enteredEndHours * 60 + enteredEndMins)
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
