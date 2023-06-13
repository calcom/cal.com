import { CalendarX2 } from "lucide-react";
import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { Slots } from "@calcom/features/schedules";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { Button, SkeletonText } from "@calcom/ui";

import { useBookerStore } from "../Booker/store";
import { useTimePreferences } from "../lib";
import { TimeFormatToggle } from "./TimeFormatToggle";

type AvailableTimesProps = {
  date: Dayjs;
  slots: Slots[string];
  onTimeSelect: (time: string) => void;
  seatsPerTimeslot?: number | null;
  showTimeformatToggle?: boolean;
  className?: string;
};

export const AvailableTimes = ({
  date,
  slots,
  onTimeSelect,
  seatsPerTimeslot,
  showTimeformatToggle = true,
  className,
}: AvailableTimesProps) => {
  const { t, i18n } = useLocale();
  const [timeFormat, timezone] = useTimePreferences((state) => [state.timeFormat, state.timezone]);
  const hasTimeSlots = !!seatsPerTimeslot;
  const [layout] = useBookerStore((state) => [state.layout], shallow);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW;
  const isMonthView = layout === BookerLayouts.MONTH_VIEW;
  const isToday = dayjs().isSame(date, "day");

  return (
    <div className={classNames("text-default", className)}>
      <header className="bg-default before:bg-default dark:bg-muted dark:before:bg-muted mb-3 flex w-full flex-row items-center font-medium">
        <span
          className={classNames(
            isColumnView && "w-full text-center",
            isColumnView ? "text-subtle text-xs uppercase" : "text-emphasis font-semibold"
          )}>
          <span className={classNames(isToday && "!text-default")}>
            {nameOfDay(i18n.language, Number(date.format("d")), "short")}
          </span>
          <span
            className={classNames(
              isColumnView && isToday && "bg-brand-default text-brand ml-2",
              "inline-flex items-center justify-center rounded-3xl px-1 pt-0.5 font-medium",
              isMonthView ? "text-default text-sm" : "text-xs"
            )}>
            {date.format("DD")}
          </span>
        </span>

        {showTimeformatToggle && (
          <div className="ml-auto">
            <TimeFormatToggle />
          </div>
        )}
      </header>
      <div className="h-full pb-4">
        {!slots.length && (
          <div className="bg-subtle flex h-full flex-col items-center rounded-md p-6">
            <CalendarX2 className="text-muted mb-2 h-4 w-4" />
            <p className={classNames("text-muted", showTimeformatToggle ? "-mt-1 text-lg" : "text-sm")}>
              {t("all_booked_today")}
            </p>
          </div>
        )}

        {slots.map((slot) => {
          const bookingFull = !!(hasTimeSlots && slot.attendees && slot.attendees >= seatsPerTimeslot);
          return (
            <Button
              key={slot.time}
              disabled={bookingFull}
              data-testid="time"
              data-disabled={bookingFull}
              data-time={slot.time}
              onClick={() => onTimeSelect(slot.time)}
              className="min-h-9 mb-2 flex h-auto w-full flex-col justify-center py-2"
              color="secondary">
              {dayjs.utc(slot.time).tz(timezone).format(timeFormat)}
              {bookingFull && <p className="text-sm">{t("booking_full")}</p>}
              {hasTimeSlots && !bookingFull && (
                <p className="flex items-center text-sm lowercase">
                  <span
                    className={classNames(
                      slot.attendees && slot.attendees / seatsPerTimeslot >= 0.8
                        ? "bg-rose-600"
                        : slot.attendees && slot.attendees / seatsPerTimeslot >= 0.33
                        ? "bg-yellow-500"
                        : "bg-emerald-400",
                      "mr-1 inline-block h-2 w-2 rounded-full"
                    )}
                    aria-hidden
                  />
                  {slot.attendees ? seatsPerTimeslot - slot.attendees : seatsPerTimeslot}{" "}
                  {t("seats_available", {
                    count: slot.attendees ? seatsPerTimeslot - slot.attendees : seatsPerTimeslot,
                  })}
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
  <div className="mt-8 flex w-[20%] flex-col only:w-full">
    {/* Random number of elements between 1 and 6. */}
    {Array.from({ length: Math.floor(Math.random() * 6) + 1 }).map((_, i) => (
      <SkeletonText className="mb-4 h-6 w-full" key={i} />
    ))}
  </div>
);
