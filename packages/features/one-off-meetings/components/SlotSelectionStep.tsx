"use client";

import { useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import { TimeFormatToggle } from "@calcom/features/bookings/components/TimeFormatToggle";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

interface SlotSelectionStepProps {
  duration: number;
  timeZone: string;
  selectedSlots: { startTime: Date; endTime: Date }[];
  onSlotSelect: (slot: { startTime: Date; endTime: Date }) => void;
  onSlotRemove: (slot: { startTime: Date; endTime: Date }) => void;
}

export function SlotSelectionStep({
  duration,
  timeZone,
  selectedSlots,
  onSlotSelect,
  onSlotRemove,
}: SlotSelectionStepProps) {
  const { t } = useLocale();
  const { timeFormat } = useTimePreferences();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    dayjs().tz(timeZone).startOf("week").toDate()
  );

  // Calculate week end for bookings query
  const currentWeekEnd = useMemo(() => 
    dayjs(currentWeekStart).tz(timeZone).add(7, "day").endOf("day").toDate(),
    [currentWeekStart, timeZone]
  );

  // Fetch user's bookings for the current week to check for conflicts
  const { data: bookingsData } = trpc.viewer.bookings.get.useQuery(
    {
      filters: {
        status: "upcoming",
        afterStartDate: dayjs(currentWeekStart).toISOString(),
        beforeEndDate: dayjs(currentWeekEnd).toISOString(),
      },
      limit: 100,
      offset: 0,
    },
    {
      staleTime: 30000, // Cache for 30 seconds
    }
  );

  const existingBookings = useMemo(() => {
    if (!bookingsData?.bookings) return [];
    return bookingsData.bookings.map((booking) => ({
      startTime: new Date(booking.startTime),
      endTime: new Date(booking.endTime),
      title: booking.title,
    }));
  }, [bookingsData]);

  // Check if a slot conflicts with any existing booking
  const isSlotBusy = (slotStart: Date, slotEnd: Date) => {
    return existingBookings.some((booking) => {
      // Check for overlap: slot overlaps if it starts before booking ends AND ends after booking starts
      return slotStart < booking.endTime && slotEnd > booking.startTime;
    });
  };

  // Generate days for the current week view
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(dayjs(currentWeekStart).tz(timeZone).add(i, "day"));
    }
    return days;
  }, [currentWeekStart, timeZone]);

  // Generate time slots for each day (full 24 hours)
  const generateDaySlots = (day: dayjs.Dayjs) => {
    const slots = [];
    const startHour = 0;
    const endHour = 24;
    const now = dayjs();
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        const slotStart = day.hour(hour).minute(minute).second(0).millisecond(0);
        const slotEnd = slotStart.add(duration, "minutes");
        const isPast = slotStart.isBefore(now);
        const isBusy = isSlotBusy(slotStart.toDate(), slotEnd.toDate());
        
        slots.push({
          startTime: slotStart.toDate(),
          endTime: slotEnd.toDate(),
          isPast,
          isBusy,
        });
      }
    }
    return slots;
  };

  const isSlotSelected = (slot: { startTime: Date; endTime: Date }) => {
    return selectedSlots.some(
      (s) =>
        s.startTime.getTime() === slot.startTime.getTime() &&
        s.endTime.getTime() === slot.endTime.getTime()
    );
  };

  const handleSlotClick = (slot: { startTime: Date; endTime: Date }) => {
    if (isSlotSelected(slot)) {
      onSlotRemove(slot);
    } else {
      onSlotSelect(slot);
    }
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "prev"
        ? dayjs(prev).subtract(1, "week").toDate()
        : dayjs(prev).add(1, "week").toDate()
    );
  };

  const canGoPrev = dayjs(currentWeekStart).isAfter(dayjs().startOf("week"));

  const formatTime = (date: Date) => {
    return dayjs(date).tz(timeZone).format(timeFormat);
  };

  return (
    <div className="relative mt-2 flex flex-col gap-2">
      {/* Week Navigation - positioned top right at title level */}
      <div className="absolute -top-16 right-0 flex items-center gap-2">
        <Button
          color="minimal"
          size="sm"
          onClick={() => handleWeekChange("prev")}
          disabled={!canGoPrev}
          StartIcon="chevron-left"
        />
        <span className="text-emphasis text-sm font-medium">
          {dayjs(currentWeekStart).tz(timeZone).format("MMM D")} -{" "}
          {dayjs(currentWeekStart).tz(timeZone).add(6, "day").format("MMM D, YYYY")}
        </span>
        <Button
          color="minimal"
          size="sm"
          onClick={() => handleWeekChange("next")}
          StartIcon="chevron-right"
        />
        <div className="ml-2 border-l pl-2">
          <TimeFormatToggle />
        </div>
      </div>

      {/* Days with time slots */}
      <div className="max-h-[50vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {weekDays.map((day) => {
            const daySlots = generateDaySlots(day);
            const isPastDay = day.endOf("day").isBefore(dayjs());
            const isToday = day.isSame(dayjs(), "day");

            return (
              <div
                key={day.format("YYYY-MM-DD")}
                className={`rounded-lg border p-2 ${isPastDay ? "opacity-50" : ""}`}>
                <h4
                  className={`mb-2 text-center font-medium ${
                    isToday ? "text-brand-default" : isPastDay ? "text-muted" : "text-emphasis"
                  }`}>
                  {day.format("dddd")}
                  <br />
                  <span className={`text-sm font-normal ${isPastDay ? "text-muted" : "text-subtle"}`}>
                    {day.format("MMM D")}
                  </span>
                  {isToday && (
                    <span className="ml-1 text-xs text-brand-default">({t("today")})</span>
                  )}
                </h4>
                <div className="flex flex-col gap-1">
                  {daySlots.map((slot, idx) => {
                    const selected = isSlotSelected(slot);
                    const isPastSlot = slot.isPast;
                    const isBusySlot = slot.isBusy;
                    const isDisabled = isPastSlot || isBusySlot;
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => !isDisabled && handleSlotClick(slot)}
                        disabled={isDisabled}
                        title={isBusySlot ? t("slot_busy") : undefined}
                        className={`w-full rounded-md px-2 py-1.5 text-center text-sm transition-colors ${
                          isPastSlot
                            ? "cursor-not-allowed bg-muted text-muted"
                            : isBusySlot
                              ? "cursor-not-allowed bg-muted text-muted line-through"
                              : selected
                                ? "bg-brand-default text-brand hover:bg-brand-emphasis"
                                : "bg-subtle text-default hover:bg-emphasis"
                        }`}>
                        {formatTime(slot.startTime)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected slots summary */}
      <div className="border-t pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-subtle text-sm">
            {t("selected_slots")}: {selectedSlots.length}
          </span>
          {selectedSlots.length > 0 && (
            <Button
              color="destructive"
              variant="button"
              size="sm"
              onClick={() => selectedSlots.forEach(onSlotRemove)}>
              {t("clear_all")}
            </Button>
          )}
        </div>

        {selectedSlots.length > 0 && (
          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
            {selectedSlots
              .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
              .map((slot, idx) => (
                <Badge
                  key={idx}
                  variant="success"
                  className="flex cursor-pointer items-center gap-1 px-2 py-1"
                  onClick={() => onSlotRemove(slot)}>
                  <span>
                    {dayjs(slot.startTime).tz(timeZone).format("MMM D, h:mm A")}
                  </span>
                  <Icon name="x" className="h-3 w-3" />
                </Badge>
              ))}
          </div>
        )}

        {selectedSlots.length === 0 && (
          <p className="text-muted py-2 text-center text-sm">
            {t("no_slots_selected_hint")}
          </p>
        )}
      </div>
    </div>
  );
}
