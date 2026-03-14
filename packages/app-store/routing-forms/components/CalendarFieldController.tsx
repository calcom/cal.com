"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useSchedule } from "@calcom/features/schedules/lib/use-schedule/useSchedule";

import {
  parseEventTypeInput,
  validateEventOwnership,
  type EventTypeContext,
} from "../lib/calendarIntegrationAdapter";
import type { Field } from "../types/types";
import ExtendedDatePicker from "./calendar/ExtendedDatePicker";
import TimePicker from "./calendar/TimePicker";

type CalendarFieldControllerProps = {
  field: Field;
  value: string | number | string[] | undefined;
  onChange: (value: string) => void;
  eventType: string | null;
  formContext: EventTypeContext;
  disabled?: boolean;
  fieldStyle?: "default" | "underline";
  accentColor?: string;
  secondaryColor?: string;
};

export default function CalendarFieldController({
  field,
  value,
  onChange,
  eventType,
  formContext,
  disabled,
  fieldStyle,
  accentColor,
  secondaryColor,
}: CalendarFieldControllerProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(
    typeof value === "string" && value.length ? value : null
  );
  const lastEmittedValueRef = useRef<string>(typeof value === "string" ? value : "");
  const lastEventTypeRef = useRef<string | null>(eventType);

  const parsedEvent = useMemo(() => {
    if (!eventType) return { username: null, eventSlug: null, isTeamEvent: false };
    return parseEventTypeInput(eventType, formContext);
  }, [eventType, formContext]);

  const ownershipValid = useMemo(
    () => validateEventOwnership(parsedEvent, formContext),
    [parsedEvent, formContext]
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const month = selectedDate ? selectedDate.slice(0, 7) : dayjs().format("YYYY-MM");

  const schedule = useSchedule({
    username: parsedEvent.username,
    eventSlug: parsedEvent.eventSlug,
    isTeamEvent: parsedEvent.isTeamEvent,
    timezone,
    month,
    selectedDate: selectedDate ?? undefined,
    prefetchNextMonth: true,
    enabled: !!parsedEvent.username && !!parsedEvent.eventSlug && ownershipValid && !disabled,
  });

  const slotsByDate = schedule?.data?.slots ?? {};
  const availableDates = Object.keys(slotsByDate).sort();
  const availableTimes = selectedDate ? (slotsByDate[selectedDate] ?? []).map((slot) => slot.time) : [];

  const isLoading = !!eventType && ownershipValid && (schedule?.isPending || schedule?.isLoading);
  const hasError = !!eventType && ownershipValid && schedule?.isError;
  const isDisabled = disabled || !ownershipValid || hasError || !eventType || availableDates.length === 0;

  const isUnderline = fieldStyle === "underline";
  const inputVariant = isUnderline ? "underline" : "default";
  const underlineColor = secondaryColor ?? "var(--cal-secondary)";

  const emitValue = (next: string) => {
    if (lastEmittedValueRef.current === next) return;
    lastEmittedValueRef.current = next;
    onChange(next);
  };

  useEffect(() => {
    if (lastEventTypeRef.current === eventType) return;
    lastEventTypeRef.current = eventType;
    if (!eventType) {
      if (selectedDate || selectedTime || lastEmittedValueRef.current) {
        setSelectedDate(null);
        setSelectedTime(null);
        emitValue("");
      }
      return;
    }
    if (selectedDate || selectedTime || lastEmittedValueRef.current) {
      setSelectedDate(null);
      setSelectedTime(null);
      emitValue("");
    }
  }, [eventType, selectedDate, selectedTime]);

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      const nextDate = availableDates[0];
      if (nextDate !== selectedDate) setSelectedDate(nextDate);
      return;
    }
    if (selectedDate && !availableDates.includes(selectedDate)) {
      const nextDate = availableDates[0] ?? null;
      if (nextDate !== selectedDate) setSelectedDate(nextDate);
      setSelectedTime(null);
      emitValue("");
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (selectedTime && !availableTimes.includes(selectedTime)) {
      setSelectedTime(null);
      emitValue("");
    }
  }, [availableTimes, selectedTime]);

  if (!ownershipValid && eventType) {
    return (
      <div className="border-default text-muted rounded-md border p-3 text-xs">
        Calendar disabled: event type is not owned by this routing form owner.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
      <div className="w-full">
        <ExtendedDatePicker
          selectedDate={selectedDate}
          onChange={(nextDate) => {
            if (nextDate !== selectedDate) setSelectedDate(nextDate);
            if (selectedTime) setSelectedTime(null);
            emitValue("");
          }}
          availableDates={availableDates}
          disabled={isDisabled || isLoading}
          loading={isLoading}
          accentColor={accentColor}
          variant={inputVariant}
          underlineColor={underlineColor}
          placeholder={field.placeholder || "Pick a date"}
        />
      </div>
      <div className="w-full">
        <TimePicker
          selectedTime={selectedTime}
          timeslots={availableTimes}
          onChange={(time) => {
            if (time !== selectedTime) setSelectedTime(time);
            emitValue(time);
          }}
          disabled={isDisabled || isLoading || !selectedDate}
          variant={inputVariant}
          underlineColor={underlineColor}
          placeholder="Pick a time"
        />
      </div>
    </div>
  );
}
