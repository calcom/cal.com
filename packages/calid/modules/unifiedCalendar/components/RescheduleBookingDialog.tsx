import { Alert } from "@calid/features/ui/components/alert";
import { Button } from "@calid/features/ui/components/button";
import { Calendar } from "@calid/features/ui/components/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Select } from "@calid/features/ui/components/form/select";
import { Label } from "@calid/features/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import { differenceInMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatBookingDuration } from "../lib/formatBookingDuration";
import type { UnifiedCalendarEventVM } from "../lib/types";

interface RescheduleBookingDialogProps {
  open: boolean;
  event: UnifiedCalendarEventVM | null;
  isMobile: boolean;
  isSubmitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: { start: Date; end: Date }) => Promise<void>;
}

type TimeOption = {
  label: string;
  value: string;
  minutes: number;
};

type TimeSelectOption = {
  label: string;
  value: string;
};

const MIN_DURATION_MINUTES = 15;
const LAST_START_MINUTES = 23 * 60 + 30;
const LAST_END_MINUTES = 23 * 60 + 45;

const toTimeLabel = (minutes: number) => {
  const base = startOfDay(new Date());
  const date = setMinutes(setHours(base, Math.floor(minutes / 60)), minutes % 60);
  return format(date, "h:mm a");
};

const buildTimeOptions = (maxMinutes: number): TimeOption[] => {
  const options: TimeOption[] = [];

  for (let minutes = 0; minutes <= maxMinutes; minutes += MIN_DURATION_MINUTES) {
    options.push({
      label: toTimeLabel(minutes),
      value: String(minutes),
      minutes,
    });
  }

  return options;
};

const START_TIME_OPTIONS = buildTimeOptions(LAST_START_MINUTES);
const END_TIME_OPTIONS = buildTimeOptions(LAST_END_MINUTES);
const parseMinuteValue = (value: string): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > LAST_END_MINUTES) return null;
  return parsed;
};

const getMinutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

const buildDateWithMinutes = (date: Date, minutes: number): Date => {
  const normalizedDate = startOfDay(date);
  return setMinutes(setHours(normalizedDate, Math.floor(minutes / 60)), minutes % 60);
};

export const RescheduleBookingDialog = ({
  open,
  event,
  isMobile,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: RescheduleBookingDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [endMinutes, setEndMinutes] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!event || !open) return;

    const initialDate = startOfDay(event.start);
    const initialStartMinutes = Math.min(getMinutesOfDay(event.start), LAST_START_MINUTES);
    const initialEndMinutes = Math.min(getMinutesOfDay(event.end), LAST_END_MINUTES);

    setSelectedDate(initialDate);
    setStartMinutes(initialStartMinutes);
    setEndMinutes(Math.max(initialStartMinutes + MIN_DURATION_MINUTES, initialEndMinutes));
    setFormError(null);
  }, [event, open]);

  useEffect(() => {
    if (startMinutes === null) return;

    if (endMinutes === null || endMinutes < startMinutes + MIN_DURATION_MINUTES) {
      const nextEnd = END_TIME_OPTIONS.find(
        (option) => option.minutes >= startMinutes + MIN_DURATION_MINUTES
      );
      setEndMinutes(nextEnd?.minutes ?? null);
    }
  }, [endMinutes, startMinutes]);

  const endTimeOptions = useMemo(() => {
    if (startMinutes === null) return END_TIME_OPTIONS;
    return END_TIME_OPTIONS.filter((option) => option.minutes >= startMinutes + MIN_DURATION_MINUTES);
  }, [startMinutes]);

  const startDateTime = useMemo(() => {
    if (!selectedDate || startMinutes === null) return null;
    return buildDateWithMinutes(selectedDate, startMinutes);
  }, [selectedDate, startMinutes]);

  const endDateTime = useMemo(() => {
    if (!selectedDate || endMinutes === null) return null;
    return buildDateWithMinutes(selectedDate, endMinutes);
  }, [selectedDate, endMinutes]);

  const durationMinutes = useMemo(() => {
    if (!startDateTime || !endDateTime) return null;
    return differenceInMinutes(endDateTime, startDateTime);
  }, [endDateTime, startDateTime]);

  if (!event) {
    return null;
  }

  const handleSubmit = async () => {
    setFormError(null);

    if (!selectedDate) {
      setFormError("Select a booking date.");
      return;
    }

    if (startMinutes === null || endMinutes === null || !startDateTime || !endDateTime) {
      setFormError("Select start and end time.");
      return;
    }

    if (startOfDay(startDateTime).getTime() !== startOfDay(endDateTime).getTime()) {
      setFormError("Start and end must be on the same date.");
      return;
    }

    if (differenceInMinutes(endDateTime, startDateTime) < MIN_DURATION_MINUTES) {
      setFormError("End time must be at least 15 minutes after start time.");
      return;
    }

    await onSubmit({
      start: startDateTime,
      end: endDateTime,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
      <DialogContent className={isMobile ? "max-w-[95vw]" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-sm">Reschedule Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(submitError || formError) && (
            <Alert severity="error" message={submitError ?? formError ?? "Unable to reschedule booking."} />
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Event</Label>
            <p className="text-sm font-medium">{event.title}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="bg-default border-border/40 flex h-9 w-full items-center justify-between rounded-md border px-3 text-left text-sm outline-none">
                  <span>{selectedDate ? format(selectedDate, "PPP") : "Select date"}</span>
                  <CalendarIcon className="text-muted-foreground h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="bg-default w-auto p-0" align="start">
                <Calendar
                  className="bg-default"
                  mode="single"
                  selected={selectedDate ?? undefined}
                  onSelect={(date) => setSelectedDate(date ? startOfDay(date) : null)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Start time</Label>
              <Select
                value={
                  startMinutes === null
                    ? null
                    : {
                        value: String(startMinutes),
                        label:
                          START_TIME_OPTIONS.find((option) => String(option.value) === String(startMinutes))
                            ?.label ?? "",
                      }
                }
                onChange={(option: TimeSelectOption | null) =>
                  setStartMinutes(parseMinuteValue(option?.value ?? ""))
                }
                options={[
                  { value: "", label: "Select start time" },
                  ...START_TIME_OPTIONS.map((option) => ({
                    value: String(option.value),
                    label: option.label,
                  })),
                ]}
                innerClassNames={{
                  menuList: "max-h-[20vh]",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">End time</Label>
              <Select
                value={
                  endMinutes === null
                    ? null
                    : {
                        value: String(endMinutes),
                        label:
                          endTimeOptions.find((option) => String(option.value) === String(endMinutes))?.label ?? "",
                      }
                }
                onChange={(option: TimeSelectOption | null) =>
                  setEndMinutes(parseMinuteValue(option?.value ?? ""))
                }
                options={[
                  { value: "", label: "Select end time" },
                  ...endTimeOptions.map((option) => ({
                    value: String(option.value),
                    label: option.label,
                  })),
                ]}
                isDisabled={startMinutes === null || endTimeOptions.length === 0}
                innerClassNames={{
                  menuList: "max-h-[20vh]",
                }}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-[11px]">
            Duration:{" "}
            {typeof durationMinutes === "number" && durationMinutes >= MIN_DURATION_MINUTES
              ? formatBookingDuration(durationMinutes)
              : "Invalid range"}
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              color="minimal"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
              disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
