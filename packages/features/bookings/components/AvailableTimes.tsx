// We do not need to worry about importing framer-motion here as it is lazy imported in Booker.
import * as HoverCard from "@radix-ui/react-hover-card";
import { AnimatePresence, m } from "framer-motion";
import { CalendarX2, ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";

import dayjs from "@calcom/dayjs";
import type { Slots } from "@calcom/features/schedules";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { Button, SkeletonText } from "@calcom/ui";

import { useBookerStore } from "../Booker/store";
import { useEvent } from "../Booker/utils/event";
import { getQueryParam } from "../Booker/utils/query-param";
import { useTimePreferences } from "../lib";
import { useCheckOverlapWithOverlay } from "../lib/useCheckOverlapWithOverlay";
import { SeatsAvailabilityText } from "./SeatsAvailabilityText";

type TOnTimeSelect = (
  time: string,
  attendees: number,
  seatsPerTimeSlot?: number | null,
  bookingUid?: string
) => void;

type AvailableTimesProps = {
  slots: Slots[string];
  onTimeSelect: TOnTimeSelect;
  seatsPerTimeSlot?: number | null;
  showAvailableSeatsCount?: boolean | null;
  showTimeFormatToggle?: boolean;
  className?: string;
  selectedSlots?: string[];
};

const SlotItem = ({
  slot,
  seatsPerTimeSlot,
  selectedSlots,
  onTimeSelect,
  showAvailableSeatsCount,
}: {
  slot: Slots[string][number];
  seatsPerTimeSlot?: number | null;
  selectedSlots?: string[];
  onTimeSelect: TOnTimeSelect;
  showAvailableSeatsCount?: boolean | null;
}) => {
  const { t } = useLocale();

  const overlayCalendarToggled =
    getQueryParam("overlayCalendar") === "true" || localStorage.getItem("overlayCalendarSwitchDefault");
  const [timeFormat, timezone] = useTimePreferences((state) => [state.timeFormat, state.timezone]);
  const bookingData = useBookerStore((state) => state.bookingData);
  const layout = useBookerStore((state) => state.layout);
  const { data: event } = useEvent();
  const hasTimeSlots = !!seatsPerTimeSlot;
  const computedDateWithUsersTimezone = dayjs.utc(slot.time).tz(timezone);

  const bookingFull = !!(hasTimeSlots && slot.attendees && slot.attendees >= seatsPerTimeSlot);
  const isHalfFull = slot.attendees && seatsPerTimeSlot && slot.attendees / seatsPerTimeSlot >= 0.5;
  const isNearlyFull = slot.attendees && seatsPerTimeSlot && slot.attendees / seatsPerTimeSlot >= 0.83;
  const colorClass = isNearlyFull ? "bg-rose-600" : isHalfFull ? "bg-yellow-500" : "bg-emerald-400";

  const nowDate = dayjs();
  const usersTimezoneDate = nowDate.tz(timezone);

  const offset = (usersTimezoneDate.utcOffset() - nowDate.utcOffset()) / 60;

  const { isOverlapping, overlappingTimeEnd, overlappingTimeStart } = useCheckOverlapWithOverlay({
    start: computedDateWithUsersTimezone,
    selectedDuration: event?.length ?? 0,
    offset,
  });

  const [overlapConfirm, setOverlapConfirm] = useState(false);

  const onButtonClick = useCallback(() => {
    if (!overlayCalendarToggled) {
      onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid);
      return;
    }
    if (isOverlapping && overlapConfirm) {
      setOverlapConfirm(false);
      return;
    }

    if (isOverlapping && !overlapConfirm) {
      setOverlapConfirm(true);
      return;
    }
    if (!overlapConfirm) {
      onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid);
    }
  }, [
    overlayCalendarToggled,
    isOverlapping,
    overlapConfirm,
    onTimeSelect,
    slot.time,
    slot?.attendees,
    slot.bookingUid,
    seatsPerTimeSlot,
  ]);

  return (
    <AnimatePresence>
      <div className="flex gap-2">
        <Button
          key={slot.time}
          disabled={bookingFull || !!(slot.bookingUid && slot.bookingUid === bookingData?.uid)}
          data-testid="time"
          data-disabled={bookingFull}
          data-time={slot.time}
          onClick={onButtonClick}
          className={classNames(
            "min-h-9 hover:border-brand-default mb-2 flex h-auto w-full flex-grow flex-col justify-center py-2",
            selectedSlots?.includes(slot.time) && "border-brand-default"
          )}
          color="secondary">
          <div className="flex items-center gap-2">
            {!hasTimeSlots && overlayCalendarToggled && (
              <span
                className={classNames(
                  "inline-block h-2 w-2 rounded-full",
                  isOverlapping ? "bg-rose-600" : "bg-emerald-400"
                )}
              />
            )}
            {computedDateWithUsersTimezone.format(timeFormat)}
          </div>
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
        {overlapConfirm && isOverlapping && (
          <HoverCard.Root>
            <HoverCard.Trigger asChild>
              <m.div initial={{ width: 0 }} animate={{ width: "auto" }} exit={{ width: 0 }}>
                <Button
                  variant={layout === "column_view" ? "icon" : "button"}
                  StartIcon={layout === "column_view" ? ChevronRight : undefined}
                  onClick={() =>
                    onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid)
                  }>
                  {layout !== "column_view" && t("confirm")}
                </Button>
              </m.div>
            </HoverCard.Trigger>
            <HoverCard.Portal>
              <HoverCard.Content side="top" align="end" sideOffset={2}>
                <div className="text-emphasis bg-inverted text-inverted w-[var(--booker-timeslots-width)] rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <p>Busy</p>
                  </div>
                  <p className="text-muted">
                    {overlappingTimeStart} - {overlappingTimeEnd}
                  </p>
                </div>
              </HoverCard.Content>
            </HoverCard.Portal>
          </HoverCard.Root>
        )}
      </div>
    </AnimatePresence>
  );
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
  const { t } = useLocale();

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
        {slots.map((slot) => (
          <SlotItem
            key={slot.time}
            onTimeSelect={onTimeSelect}
            slot={slot}
            selectedSlots={selectedSlots}
            seatsPerTimeSlot={seatsPerTimeSlot}
            showAvailableSeatsCount={showAvailableSeatsCount}
          />
        ))}
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
