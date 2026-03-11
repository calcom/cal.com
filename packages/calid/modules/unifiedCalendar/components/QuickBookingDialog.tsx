import { Alert } from "@calid/features/ui/components/alert";
import { Button } from "@calid/features/ui/components/button";
import { Calendar } from "@calid/features/ui/components/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import { differenceInMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import { getEventLocationType, isAttendeeInputRequired } from "@calcom/app-store/locations";
import { trpc } from "@calcom/trpc/react";

import type { ConnectedCalendarVM, QuickBookSlot, UnifiedCalendarBookingFormInput } from "../lib/types";

interface QuickBookingDialogProps {
  open: boolean;
  slot: QuickBookSlot | null;
  isMobile: boolean;
  calendars: ConnectedCalendarVM[];
  isSubmitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (event: UnifiedCalendarBookingFormInput) => Promise<void>;
}

type LocationOption = {
  label: string;
  value: string;
  credentialId?: number | null;
};

type LocationOptionGroup = {
  label: string;
  options: LocationOption[];
};

type TimeOption = {
  label: string;
  value: string;
  minutes: number;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

const buildDateWithMinutes = (date: Date, minutes: number): Date => {
  const normalizedDate = startOfDay(date);
  return setMinutes(setHours(normalizedDate, Math.floor(minutes / 60)), minutes % 60);
};

const buildLocationValue = (params: {
  locationType: string;
  locationInput: string;
}): { location: string | null; requiresInput: boolean } => {
  if (!params.locationType) {
    return {
      location: null,
      requiresInput: false,
    };
  }

  const eventLocationType = getEventLocationType(params.locationType);
  if (eventLocationType?.organizerInputType) {
    return {
      location: params.locationInput.trim() || null,
      requiresInput: true,
    };
  }

  return {
    location: params.locationType,
    requiresInput: false,
  };
};

export const QuickBookingDialog = ({
  open,
  slot,
  isMobile,
  calendars,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: QuickBookingDialogProps) => {
  const locationOptionsQuery = trpc.viewer.apps.locationOptions.useQuery(
    {},
    {
      enabled: open,
      refetchOnWindowFocus: false,
    }
  );

  const locationGroups = useMemo<LocationOptionGroup[]>(() => {
    const rawGroups = (locationOptionsQuery.data ?? []) as unknown as LocationOptionGroup[];
    return rawGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => {
          if (isAttendeeInputRequired(option.value)) return false;
          return (
            option.value.startsWith("integrations:") ||
            option.value === "inPerson" ||
            option.value === "userPhone"
          );
        }),
      }))
      .filter((group) => group.options.length > 0);
  }, [locationOptionsQuery.data]);

  const flattenedLocationOptions = useMemo(
    () => locationGroups.flatMap((group) => group.options),
    [locationGroups]
  );

  const [title, setTitle] = useState("");
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || "");
  const [attendeeRows, setAttendeeRows] = useState<string[]>([""]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [endMinutes, setEndMinutes] = useState<number | null>(null);
  const [locationType, setLocationType] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!slot || !open) return;

    const initialDate = startOfDay(slot.date);
    const initialStartMinutes = Math.min(slot.hour * 60, LAST_START_MINUTES);
    const initialEndMinutes = Math.min(initialStartMinutes + 30, LAST_END_MINUTES);

    setTitle("");
    setCalendarId(calendars[0]?.id || "");
    setAttendeeRows([""]);
    setSelectedDate(initialDate);
    setStartMinutes(initialStartMinutes);
    setEndMinutes(Math.max(initialStartMinutes + MIN_DURATION_MINUTES, initialEndMinutes));
    setLocationType("");
    setLocationInput("");
    setNotes("");
    setFormError(null);
  }, [calendars, open, slot]);

  useEffect(() => {
    if (!locationType && flattenedLocationOptions.length > 0) {
      setLocationType(flattenedLocationOptions[0].value);
      setLocationInput("");
    }
  }, [flattenedLocationOptions, locationType]);

  useEffect(() => {
    if (startMinutes === null) return;

    if (endMinutes === null || endMinutes < startMinutes + MIN_DURATION_MINUTES) {
      const nextEnd = END_TIME_OPTIONS.find(
        (option) => option.minutes >= startMinutes + MIN_DURATION_MINUTES
      );
      setEndMinutes(nextEnd?.minutes ?? null);
    }
  }, [endMinutes, startMinutes]);

  const selectedLocationOption = useMemo(() => {
    return flattenedLocationOptions.find((option) => option.value === locationType);
  }, [flattenedLocationOptions, locationType]);

  const selectedLocationType = useMemo(() => getEventLocationType(locationType), [locationType]);

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

  if (!slot) {
    return null;
  }

  const hasCalendarChoices = calendars.length > 0;

  const normalizedAttendees = attendeeRows
    .map((row) => row.trim().toLowerCase())
    .filter((row): row is string => Boolean(row));

  const attendeesInvalid = normalizedAttendees.some((attendee) => !EMAIL_REGEX.test(attendee));

  const addAttendeeRow = () => {
    setAttendeeRows((current) => [...current, ""]);
  };

  const removeAttendeeRow = (index: number) => {
    setAttendeeRows((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const updateAttendeeRow = (index: number, value: string) => {
    setAttendeeRows((current) => current.map((row, rowIndex) => (rowIndex === index ? value : row)));
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!title.trim()) {
      setFormError("Event title is required.");
      return;
    }

    if (!hasCalendarChoices || !calendarId) {
      setFormError("Select a target calendar.");
      return;
    }

    if (!selectedDate) {
      setFormError("Select a booking date.");
      return;
    }

    if (startMinutes === null || endMinutes === null) {
      setFormError("Select start and end time.");
      return;
    }

    if (!startDateTime || !endDateTime) {
      setFormError("Choose a valid start and end time.");
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

    if (normalizedAttendees.length === 0) {
      setFormError("Add at least one attendee email.");
      return;
    }

    if (attendeesInvalid) {
      setFormError("One or more attendee emails are invalid.");
      return;
    }

    const derivedLocation = buildLocationValue({
      locationType,
      locationInput,
    });

    if (derivedLocation.requiresInput && !derivedLocation.location) {
      setFormError("Provide a value for the selected location.");
      return;
    }

    await onSubmit({
      title: title.trim(),
      start: startDateTime,
      end: endDateTime,
      calendarId,
      attendees: normalizedAttendees,
      location: derivedLocation.location,
      locationCredentialId: selectedLocationOption?.credentialId ?? null,
      description: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
      <DialogContent className={isMobile ? "max-w-[95vw]" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-sm">New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(submitError || formError) && (
            <Alert severity="error" message={submitError ?? formError ?? "Unable to create booking."} />
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Event title</Label>
            <Input
              placeholder="Meeting title"
              value={title}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
              className="h-9"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Attendees</Label>
              <Button
                color="minimal"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={addAttendeeRow}
                disabled={isSubmitting}>
                Add Attendee
              </Button>
            </div>

            <div className="space-y-2">
              {attendeeRows.map((attendee, index) => (
                <div key={`attendee-${index}`} className="flex items-center gap-2">
                  <Input
                    placeholder="email@example.com"
                    value={attendee}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateAttendeeRow(index, event.target.value)
                    }
                    className="h-9"
                  />
                  {attendeeRows.length > 1 && (
                    <Button
                      color="minimal"
                      size="sm"
                      className="h-9 px-2 text-xs"
                      onClick={() => removeAttendeeRow(index)}
                      disabled={isSubmitting}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
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
              <select
                value={startMinutes === null ? "" : String(startMinutes)}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setStartMinutes(parseMinuteValue(event.target.value))
                }
                className="bg-default border-border/40 h-9 w-full rounded-md border px-3 text-sm outline-none">
                <option value="">Select start time</option>
                {START_TIME_OPTIONS.map((option) => (
                  <option key={`start-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">End time</Label>
              <select
                value={endMinutes === null ? "" : String(endMinutes)}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setEndMinutes(parseMinuteValue(event.target.value))
                }
                className="bg-default border-border/40 h-9 w-full rounded-md border px-3 text-sm outline-none"
                disabled={startMinutes === null || endTimeOptions.length === 0}>
                <option value="">Select end time</option>
                {endTimeOptions.map((option) => (
                  <option key={`end-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-muted-foreground text-[11px]">
            Duration:{" "}
            {typeof durationMinutes === "number" && durationMinutes >= MIN_DURATION_MINUTES
              ? `${durationMinutes} min`
              : "Invalid range"}
          </p>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Target calendar</Label>
            <select
              value={calendarId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setCalendarId(event.target.value)}
              disabled={!hasCalendarChoices}
              className="bg-default border-border/40 h-9 w-full rounded-md border px-3 text-sm outline-none">
              {!hasCalendarChoices && <option value="">No writable calendars available</option>}
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Location</Label>
            <select
              value={locationType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setLocationType(event.target.value);
                setLocationInput("");
              }}
              disabled={locationOptionsQuery.isPending || flattenedLocationOptions.length === 0}
              className="bg-default border-border/40 h-9 w-full rounded-md border px-3 text-sm outline-none">
              {locationOptionsQuery.isPending && <option value="">Loading locations...</option>}
              {!locationOptionsQuery.isPending && flattenedLocationOptions.length === 0 && (
                <option value="">No supported location options</option>
              )}
              {locationGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={`${group.label}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {selectedLocationType?.organizerInputType && (
              <Input
                placeholder={selectedLocationType.organizerInputPlaceholder || "Enter location value"}
                value={locationInput}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setLocationInput(event.target.value)}
                className="h-9"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Booking note</Label>
            <TextArea
              placeholder="Add notes..."
              value={notes}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              color="minimal"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
              disabled={isSubmitting}>
              Cancel
            </Button>

            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={isSubmitting || locationOptionsQuery.isPending}
              onClick={handleSubmit}>
              {isSubmitting ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
