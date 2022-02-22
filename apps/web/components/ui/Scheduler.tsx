import { TrashIcon } from "@heroicons/react/outline";
import { Availability } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useEffect, useState } from "react";
import TimezoneSelect, { ITimezoneOption } from "react-timezone-select";

import { useLocale } from "@lib/hooks/useLocale";

import Button from "@components/ui/Button";

import { WeekdaySelect } from "./WeekdaySelect";
import SetTimesModal from "./modal/SetTimesModal";

dayjs.extend(utc);
dayjs.extend(timezone);

type AvailabilityInput = Pick<Availability, "days" | "startTime" | "endTime">;

type Props = {
  timeZone: string;
  availability: Availability[];
  setTimeZone: (timeZone: string) => void;
  setAvailability: (schedule: {
    openingHours: AvailabilityInput[];
    dateOverrides: AvailabilityInput[];
  }) => void;
};

/**
 * @deprecated
 */
export const Scheduler = ({ availability, setAvailability, timeZone, setTimeZone }: Props) => {
  const { t, i18n } = useLocale();
  const [editSchedule, setEditSchedule] = useState(-1);
  const [openingHours, setOpeningHours] = useState<Availability[]>([]);

  useEffect(() => {
    setOpeningHours(availability.filter((item: Availability) => item.days.length !== 0));
  }, []);

  useEffect(() => {
    setAvailability({ openingHours, dateOverrides: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openingHours]);

  const addNewSchedule = () => setEditSchedule(openingHours.length);

  const applyEditSchedule = (changed: Availability) => {
    // new entry
    if (!changed.days) {
      changed.days = [1, 2, 3, 4, 5]; // Mon - Fri
      setOpeningHours(openingHours.concat(changed));
    } else {
      // update
      const replaceWith = { ...openingHours[editSchedule], ...changed };
      openingHours.splice(editSchedule, 1, replaceWith);
      setOpeningHours([...openingHours]);
    }
  };

  const removeScheduleAt = (toRemove: number) => {
    openingHours.splice(toRemove, 1);
    setOpeningHours([...openingHours]);
  };

  const OpeningHours = ({ idx, item }: { idx: number; item: Availability }) => (
    <li className="flex justify-between border-b py-2">
      <div className="flex flex-col space-y-4 lg:inline-flex">
        <WeekdaySelect defaultValue={item.days} onSelect={(selected: number[]) => (item.days = selected)} />
        <button
          className="rounded-sm bg-neutral-100 px-3 py-2 text-sm"
          type="button"
          onClick={() => setEditSchedule(idx)}>
          {item.startTime.toLocaleTimeString(i18n.language, {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "UTC",
          })}
          &nbsp;{t("until")}&nbsp;
          {item.endTime.toLocaleTimeString(i18n.language, {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "UTC",
          })}
        </button>
      </div>
      <button
        type="button"
        onClick={() => removeScheduleAt(idx)}
        className="btn-sm ml-1 bg-transparent px-2 py-1">
        <TrashIcon className="-mt-1 inline h-5 w-5 text-gray-400" />
      </button>
    </li>
  );

  return (
    <div>
      <div className="flex">
        <div className="w-full">
          <div>
            <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
              {t("timezone")}
            </label>
            <div className="mt-1">
              <TimezoneSelect
                id="timeZone"
                value={timeZone}
                onChange={(tz: ITimezoneOption) => setTimeZone(tz.value)}
                className="focus:border-brand mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
              />
            </div>
          </div>
          <ul>
            {openingHours.map((item, idx) => (
              <OpeningHours key={idx} idx={idx} item={item} />
            ))}
          </ul>
          <Button type="button" onClick={addNewSchedule} className="mt-2" color="secondary" size="sm">
            {t("add_another")}
          </Button>
        </div>
      </div>
      {editSchedule >= 0 && (
        <SetTimesModal
          startTime={
            openingHours[editSchedule]
              ? new Date(openingHours[editSchedule].startTime).getUTCHours() * 60 +
                new Date(openingHours[editSchedule].startTime).getUTCMinutes()
              : 540
          }
          endTime={
            openingHours[editSchedule]
              ? new Date(openingHours[editSchedule].endTime).getUTCHours() * 60 +
                new Date(openingHours[editSchedule].endTime).getUTCMinutes()
              : 1020
          }
          onChange={(times: { startTime: number; endTime: number }) =>
            applyEditSchedule({
              ...(openingHours[editSchedule] || {}),
              startTime: new Date(
                new Date().setUTCHours(Math.floor(times.startTime / 60), times.startTime % 60, 0, 0)
              ),
              endTime: new Date(
                new Date().setUTCHours(Math.floor(times.endTime / 60), times.endTime % 60, 0, 0)
              ),
            })
          }
          onExit={() => setEditSchedule(-1)}
        />
      )}
    </div>
  );
};
