import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { Slots } from "@calcom/features/schedules";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import { Button, SkeletonText } from "@calcom/ui";

import { useTimePreferences } from "../lib";
import { TimeFormatToggle } from "./TimeFormatToggle";

type AvailableTimesProps = {
  date: Dayjs;
  slots: Slots[string];
  timezone: string;
  onTimeSelect: (time: string) => void;
  seatsPerTimeslot?: number | null;
  showTimeformatToggle?: boolean;
  className?: string;
};

export const AvailableTimes = ({
  date,
  slots,
  timezone,
  onTimeSelect,
  seatsPerTimeslot,
  showTimeformatToggle = true,
  className,
}: AvailableTimesProps) => {
  const { t, i18n } = useLocale();
  const timeFormat = useTimePreferences((state) => state.timeFormat);
  const hasTimeSlots = !!seatsPerTimeslot;

  return (
    <div className={classNames("dark:text-white", className)}>
      <header className="dark:bg-darkgray-100 dark:before:bg-darkgray-100 sticky top-0 left-0 z-10 mb-8 flex flex w-full w-full flex-row items-center bg-white before:absolute before:-top-12 before:h-24 before:w-full before:bg-white md:flex-col md:items-start lg:flex-row lg:items-center">
        <span className="relative z-10">
          <span className="font-semibold text-gray-900 dark:text-white">
            {nameOfDay(i18n.language, Number(date.format("d")), "short")}
          </span>
          <span>
            , {date.toDate().toLocaleString(i18n.language, { month: "short" })} {date.format(" D ")}
          </span>
        </span>

        {showTimeformatToggle && (
          <div className="ml-auto md:ml-0 lg:ml-auto">
            <TimeFormatToggle />
          </div>
        )}
      </header>
      <div className="pb-4">
        {slots.map((slot) => {
          const bookingFull = !!(hasTimeSlots && slot.attendees && slot.attendees >= seatsPerTimeslot);
          return (
            <Button
              key={slot.time}
              disabled={bookingFull}
              data-testid="time"
              data-time={slot.time}
              onClick={() => onTimeSelect(slot.time)}
              className="mb-3 block flex h-auto min-h-[44px] w-full flex-col items-center justify-center py-2"
              color="secondary">
              {dayjs.utc(slot.time).tz(timezone).format(timeFormat)}
              {bookingFull && <p className="text-sm">{t("booking_full")}</p>}
              {hasTimeSlots && !bookingFull && (
                <p
                  className={`${
                    slot.attendees && slot.attendees / seatsPerTimeslot >= 0.8
                      ? "text-rose-600"
                      : slot.attendees && slot.attendees / seatsPerTimeslot >= 0.33
                      ? "text-yellow-500"
                      : "text-emerald-400"
                  } text-sm`}>
                  {slot.attendees ? seatsPerTimeslot - slot.attendees : seatsPerTimeslot} / {seatsPerTimeslot}{" "}
                  {t("seats_available")}
                </p>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export const AvailableTimesSkeleton = () => (
  <div className="mt-8 flex h-full w-[20%] flex-col only:w-full">
    {/* Random number of elements between 1 and 10. */}
    {Array.from({ length: Math.floor(Math.random() * 10) + 1 }).map((_, i) => (
      <SkeletonText className="mb-4 h-6 w-full" key={i} />
    ))}
  </div>
);
