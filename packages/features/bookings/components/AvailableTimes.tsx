import { CalendarX2 } from "lucide-react";

import dayjs from "@calcom/dayjs";
import type { Slots } from "@calcom/features/schedules";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, SkeletonText } from "@calcom/ui";

import { useBookerStore } from "../Booker/store";
import { useTimePreferences } from "../lib";
import { SeatsAvailabilityText } from "./SeatsAvailabilityText";

type AvailableTimesProps = {
  slots: Slots[string];
  onTimeSelect: (
    time: string,
    attendees: number,
    seatsPerTimeSlot?: number | null,
    bookingUid?: string
  ) => void;
  seatsPerTimeSlot?: number | null;
  showAvailableSeatsCount?: boolean | null;
  showTimeFormatToggle?: boolean;
  className?: string;
  selectedSlots?: string[];
};

export const AvailableTimes = ({
  slots,
  onTimeSelect,
  seatsPerTimeSlot,
  showAvailableSeatsCount,
  showTimeFormatToggle = true,
  className,
  selectedSlots,
}: AvailableTimesProps) => {
  const { t, i18n } = useLocale();
  const [timeFormat, timezone] = useTimePreferences((state) => [state.timeFormat, state.timezone]);
  const bookingData = useBookerStore((state) => state.bookingData);
  const hasTimeSlots = !!seatsPerTimeSlot;

  return (
    <div className={classNames("text-default flex flex-col", className)}>
      <div className="h-full pb-4">
        {!slots.length && (
          <div className="bg-subtle border-subtle flex h-full flex-col items-center rounded-md border p-6 dark:bg-transparent">
            <CalendarX2 className="text-muted mb-2 h-4 w-4" />
            <p className={classNames("text-muted", showTimeFormatToggle ? "-mt-1 text-lg" : "text-sm")}>
              {t("all_booked_today")}
            </p>
          </div>
        )}

        {slots.map((slot) => {
          const bookingFull = !!(hasTimeSlots && slot.attendees && slot.attendees >= seatsPerTimeSlot);
          const isHalfFull = slot.attendees && seatsPerTimeSlot && slot.attendees / seatsPerTimeSlot >= 0.5;
          const isNearlyFull =
            slot.attendees && seatsPerTimeSlot && slot.attendees / seatsPerTimeSlot >= 0.83;

          const colorClass = isNearlyFull ? "bg-rose-600" : isHalfFull ? "bg-yellow-500" : "bg-emerald-400";
          return (
            <Button
              key={slot.time}
              disabled={bookingFull || !!(slot.bookingUid && slot.bookingUid === bookingData?.uid)}
              data-testid="time"
              data-disabled={bookingFull}
              data-time={slot.time}
              onClick={() => onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid)}
              className={classNames(
                "min-h-9 hover:border-brand-default mb-2 flex h-auto w-full flex-col justify-center py-2",
                selectedSlots?.includes(slot.time) && "border-brand-default"
              )}
              color="secondary">
              {dayjs.utc(slot.time).tz(timezone).format(timeFormat)}
              {bookingFull && <p className="text-sm">{t("booking_full")}</p>}
              {hasTimeSlots && !bookingFull && (
                <p className="flex items-center text-sm">
                  <span
                    className={classNames(colorClass, "mr-1 inline-block h-2 w-2 rounded-full")}
                    aria-hidden
                  />
                  <SeatsAvailabilityText
                    showExact={!!showAvailableSeatsCount}
                    totalSeats={seatsPerTimeSlot}
                    bookedSeats={slot.attendees || 0}
                  />
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
  <div className="flex w-[20%] flex-col only:w-full">
    {/* Random number of elements between 1 and 6. */}
    {Array.from({ length: Math.floor(Math.random() * 6) + 1 }).map((_, i) => (
      <SkeletonText className="mb-4 h-6 w-full" key={i} />
    ))}
  </div>
);
