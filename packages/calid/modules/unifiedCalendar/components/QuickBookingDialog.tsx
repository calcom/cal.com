import { Alert } from "@calid/features/ui/components/alert";
import { Button } from "@calid/features/ui/components/button";
import { Calendar } from "@calid/features/ui/components/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Select } from "@calid/features/ui/components/form/select";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import { differenceInMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { getEventLocationType, isAttendeeInputRequired } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { formatBookingDuration } from "../lib/formatBookingDuration";
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

type TimeSelectOption = {
  label: string;
  value: string;
};

type CalendarSelectOption = {
  label: string;
  value: string;
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

const toValidLocationCredentialId = (credentialId: number | null | undefined) => {
  return typeof credentialId === "number" && credentialId > 0 ? credentialId : null;
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
  const wasOpenRef = useRef(false);
  const initializedSlotKeyRef = useRef<string | null>(null);

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
  const [attendeesInput, setAttendeesInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [endMinutes, setEndMinutes] = useState<number | null>(null);
  const [locationType, setLocationType] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!slot || !open) return;

    const slotKey = `${startOfDay(slot.date).getTime()}-${slot.hour}`;
    const shouldInitialize = !wasOpenRef.current || initializedSlotKeyRef.current !== slotKey;
    if (!shouldInitialize) return;

    const initialDate = startOfDay(slot.date);
    const initialStartMinutes = Math.min(slot.hour * 60, LAST_START_MINUTES);
    const initialEndMinutes = Math.min(initialStartMinutes + 30, LAST_END_MINUTES);

    setTitle("");
    setCalendarId(calendars[0]?.id || "");
    setAttendeesInput("");
    setSelectedDate(initialDate);
    setStartMinutes(initialStartMinutes);
    setEndMinutes(Math.max(initialStartMinutes + MIN_DURATION_MINUTES, initialEndMinutes));
    setLocationType("");
    setLocationInput("");
    setNotes("");
    setFormError(null);
    wasOpenRef.current = true;
    initializedSlotKeyRef.current = slotKey;
  }, [calendars, open, slot]);

  useEffect(() => {
    if (open) return;

    wasOpenRef.current = false;
    initializedSlotKeyRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!calendarId && calendars.length > 0) {
      setCalendarId(calendars[0].id);
      return;
    }
    if (calendarId && calendars.some((calendar) => calendar.id === calendarId)) {
      return;
    }
    if (calendarId || calendars.length === 0) {
      setCalendarId(calendars[0]?.id || "");
    }
  }, [calendarId, calendars, open]);

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
  const { t } = useLocale();

  const selectedLocationOption = useMemo(() => {
    return flattenedLocationOptions.find((option) => option.value === locationType);
  }, [flattenedLocationOptions, locationType]);

  const selectedLocationType = useMemo(() => getEventLocationType(locationType), [locationType]);

  const calendarOptions = useMemo<CalendarSelectOption[]>(() => {
    return calendars.map((calendar) => ({
      value: calendar.id,
      label: calendar.name,
    }));
  }, [calendars]);

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

  const normalizedAttendees = attendeesInput
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

  const attendeesInvalid = normalizedAttendees.some((attendee) => !EMAIL_REGEX.test(attendee));

  const handleSubmit = async () => {
    setFormError(null);

    if (!title.trim()) {
      setFormError(t("unified_calendar_event_title_required"));
      return;
    }

    if (!hasCalendarChoices || !calendarId) {
      setFormError(t("unified_calendar_select_target_calendar"));
      return;
    }

    if (!selectedDate) {
      setFormError(t("unified_calendar_select_booking_date"));
      return;
    }

    if (startMinutes === null || endMinutes === null) {
      setFormError(t("unified_calendar_select_start_and_end_time"));
      return;
    }

    if (!startDateTime || !endDateTime) {
      setFormError(t("unified_calendar_choose_valid_start_and_end_time"));
      return;
    }

    if (startOfDay(startDateTime).getTime() !== startOfDay(endDateTime).getTime()) {
      setFormError(t("unified_calendar_start_end_same_date"));
      return;
    }

    if (differenceInMinutes(endDateTime, startDateTime) < MIN_DURATION_MINUTES) {
      setFormError(t("unified_calendar_end_time_minimum_gap"));
      return;
    }

    if (normalizedAttendees.length === 0) {
      setFormError(t("unified_calendar_add_at_least_one_attendee_email"));
      return;
    }

    if (attendeesInvalid) {
      setFormError(t("unified_calendar_one_or_more_attendee_emails_invalid"));
      return;
    }

    const derivedLocation = buildLocationValue({
      locationType,
      locationInput,
    });

    if (derivedLocation.requiresInput && !derivedLocation.location) {
      setFormError(t("unified_calendar_provide_value_for_selected_location"));
      return;
    }

    await onSubmit({
      title: title.trim(),
      start: startDateTime,
      end: endDateTime,
      calendarId,
      attendees: normalizedAttendees,
      location: derivedLocation.location,
      locationCredentialId: toValidLocationCredentialId(selectedLocationOption?.credentialId),
      description: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
      <DialogContent className={isMobile ? "max-w-[95vw]" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-sm">{t("unified_calendar_new_booking")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(submitError || formError) && (
            <Alert
              severity="error"
              message={submitError ?? formError ?? t("unified_calendar_unable_to_create_booking")}
            />
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t("unified_calendar_event_title")}</Label>
            <Input
              placeholder={t("unified_calendar_meeting_title")}
              value={title}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
              className="h-9"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t("attendees")}</Label>
            <Input
              placeholder={t("unified_calendar_attendees_placeholder")}
              value={attendeesInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setAttendeesInput(event.target.value)}
              className="h-9"
            />
            <p className="text-muted-foreground text-[11px]">{t("multiple_attendee_comma_separated")}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t("date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="bg-default border-border/40 flex h-9 w-full items-center justify-between rounded-md border px-3 text-left text-sm outline-none">
                  <span>{selectedDate ? format(selectedDate, "PPP") : t("unified_calendar_select_date")}</span>
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
              <Label className="text-muted-foreground text-xs">{t("start_time")}</Label>
              <Select
                value={
                  startMinutes === null
                    ? null
                    : {
                        value: String(startMinutes),
                        label:
                          START_TIME_OPTIONS.find((o) => String(o.value) === String(startMinutes))?.label ??
                          "",
                      }
                }
                onChange={(option: TimeSelectOption | null) =>
                  setStartMinutes(parseMinuteValue(option?.value ?? ""))
                }
                options={[
                  { value: "", label: t("unified_calendar_select_start_time") },
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
              <Label className="text-muted-foreground text-xs">{t("end_time")}</Label>
              <Select
                value={
                  endMinutes === null
                    ? null
                    : {
                        value: String(endMinutes),
                        label:
                          endTimeOptions.find((o) => String(o.value) === String(endMinutes))?.label ?? "",
                      }
                }
                onChange={(option: TimeSelectOption | null) =>
                  setEndMinutes(parseMinuteValue(option?.value ?? ""))
                }
                options={[
                  { value: "", label: t("unified_calendar_select_end_time") },
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
            {t("unified_calendar_duration_with_value", {
              duration:
                typeof durationMinutes === "number" && durationMinutes >= MIN_DURATION_MINUTES
                  ? formatBookingDuration(durationMinutes)
                  : t("unified_calendar_invalid_range"),
            })}
          </p>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t("unified_calendar_target_calendar")}</Label>
            <Select
              value={
                hasCalendarChoices
                  ? calendarOptions.find((option) => option.value === calendarId) ?? null
                  : { value: "", label: t("unified_calendar_no_writable_calendars_available") }
              }
              onChange={(option: CalendarSelectOption | null) => setCalendarId(option?.value ?? "")}
              isDisabled={!hasCalendarChoices}
              options={
                hasCalendarChoices
                  ? calendarOptions
                  : [{ value: "", label: t("unified_calendar_no_writable_calendars_available") }]
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t("location")}</Label>
            <Select
              value={
                locationOptionsQuery.isPending
                  ? { value: "", label: t("unified_calendar_loading_locations") }
                  : flattenedLocationOptions.find((option) => option.value === locationType) ?? null
              }
              onChange={(option: LocationOption | null) => {
                setLocationType(option?.value ?? "");
                setLocationInput("");
              }}
              isDisabled={locationOptionsQuery.isPending || flattenedLocationOptions.length === 0}
              options={
                locationOptionsQuery.isPending
                  ? [{ value: "", label: t("unified_calendar_loading_locations") }]
                  : flattenedLocationOptions.length === 0
                  ? [{ value: "", label: t("unified_calendar_no_supported_location_options") }]
                  : locationGroups
              }
            />

            {selectedLocationType?.organizerInputType && (
              <Input
                placeholder={
                  selectedLocationType.organizerInputPlaceholder ||
                  t("unified_calendar_enter_location_value")
                }
                value={locationInput}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setLocationInput(event.target.value)}
                className="h-9"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t("unified_calendar_booking_note")}</Label>
            <TextArea
              placeholder={t("unified_calendar_add_notes")}
              value={notes}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
              rows={2}
              className="border-default shadow-outline-gray-rested hover:border-emphasis focus:shadow-outline-gray-focused resize-none border"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              color="minimal"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
              disabled={isSubmitting}>
              {t("cancel")}
            </Button>

            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={isSubmitting || locationOptionsQuery.isPending}
              onClick={handleSubmit}>
              {isSubmitting ? t("unified_calendar_creating") : t("unified_calendar_create_booking")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
