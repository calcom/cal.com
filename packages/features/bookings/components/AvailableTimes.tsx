// We do not need to worry about importing framer-motion here as it is lazy imported in Booker.
import * as HoverCard from "@radix-ui/react-hover-card";
import { AnimatePresence, m } from "framer-motion";
import { useCallback, useState } from "react";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import type { IOutOfOfficeData } from "@calcom/core/getUserAvailability";
import dayjs from "@calcom/dayjs";
import { OutOfOfficeInSlots } from "@calcom/features/bookings/Booker/components/OutOfOfficeInSlots";
import type { Slots } from "@calcom/features/schedules";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import type { IGetAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
import { Button, Icon, SkeletonText } from "@calcom/ui";

import { useBookerStore } from "../Booker/store";
import type { useEventReturnType } from "../Booker/utils/event";
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
  slots: IGetAvailableSlots["slots"][string];
  onTimeSelect: TOnTimeSelect;
  seatsPerTimeSlot?: number | null;
  showAvailableSeatsCount?: boolean | null;
  showTimeFormatToggle?: boolean;
  className?: string;
  selectedSlots?: string[];
  event: useEventReturnType;
  customClassNames?: string;
};

const SlotItem = ({
  slot,
  seatsPerTimeSlot,
  selectedSlots,
  onTimeSelect,
  showAvailableSeatsCount,
  event,
  customClassNames,
}: {
  slot: Slots[string][number];
  seatsPerTimeSlot?: number | null;
  selectedSlots?: string[];
  onTimeSelect: TOnTimeSelect;
  showAvailableSeatsCount?: boolean | null;
  event: useEventReturnType;
  customClassNames?: string;
}) => {
  const { t } = useLocale();

  const overlayCalendarToggled =
    getQueryParam("overlayCalendar") === "true" || localStorage.getItem("overlayCalendarSwitchDefault");
  const [timeFormat, timezone] = useTimePreferences((state) => [state.timeFormat, state.timezone]);
  const bookingData = useBookerStore((state) => state.bookingData);
  const layout = useBookerStore((state) => state.layout);
  const { data: eventData } = event;
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
    selectedDuration: eventData?.length ?? 0,
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
            `min-h-9 hover:border-brand-default mb-2 flex h-auto w-full flex-grow flex-col justify-center py-2`,
            selectedSlots?.includes(slot.time) && "border-brand-default",
            `${customClassNames}`
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
                  StartIcon={layout === "column_view" ? "chevron-right" : undefined}
                  onClick={() =>
                    onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid)
                  }>
                  {layout !== "column_view" && t("confirm")}
                </Button>
              </m.div>
            </HoverCard.Trigger>
            <HoverCard.Portal>
              <HoverCard.Content side="top" align="end" sideOffset={2}>
                <div className="text-emphasis bg-inverted w-[var(--booker-timeslots-width)] rounded-md p-3">
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
  event,
  customClassNames,
}: AvailableTimesProps) => {
  const { t } = useLocale();

  const oooAllDay = slots.every((slot) => slot.away);
  if (oooAllDay) {
    return <OOOSlot {...slots[0]} />;
  }

  // Display ooo in slots once but after or before slots
  const oooBeforeSlots = slots[0] && slots[0].away;
  const oooAfterSlots = slots[slots.length - 1] && slots[slots.length - 1].away;

  return (
    <div className={classNames("text-default flex flex-col", className)}>
      <div className="h-full pb-4">
        {!slots.length && (
          <div
            data-testId="no-slots-available"
            className="bg-subtle border-subtle flex h-full flex-col items-center rounded-md border p-6 dark:bg-transparent">
            <Icon name="calendar-x-2" className="text-muted mb-2 h-4 w-4" />
            <p className={classNames("text-muted", showTimeFormatToggle ? "-mt-1 text-lg" : "text-sm")}>
              {t("all_booked_today")}
            </p>
          </div>
        )}
        {oooBeforeSlots && !oooAfterSlots && <OOOSlot {...slots[0]} />}
        {slots.map((slot) => {
          if (slot.away) return null;
          return (
            <SlotItem
              customClassNames={customClassNames}
              key={slot.time}
              onTimeSelect={onTimeSelect}
              slot={slot}
              selectedSlots={selectedSlots}
              seatsPerTimeSlot={seatsPerTimeSlot}
              showAvailableSeatsCount={showAvailableSeatsCount}
              event={event}
            />
          );
        })}
        {oooAfterSlots && !oooBeforeSlots && <OOOSlot {...slots[slots.length - 1]} className="pb-0" />}
      </div>
    </div>
  );
};

interface IOOOSlotProps {
  fromUser?: IOutOfOfficeData["anyDate"]["fromUser"];
  toUser?: IOutOfOfficeData["anyDate"]["toUser"];
  reason?: string;
  emoji?: string;
  time?: string;
  className?: string;
}

const OOOSlot: React.FC<IOOOSlotProps> = (props) => {
  const isPlatform = useIsPlatform();
  const { fromUser, toUser, reason, emoji, time, className = "" } = props;

  if (isPlatform) return <></>;
  return (
    <OutOfOfficeInSlots
      fromUser={fromUser}
      toUser={toUser}
      date={dayjs(time).format("YYYY-MM-DD")}
      reason={reason}
      emoji={emoji}
      borderDashed
      className={className}
    />
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
