"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { addMinutes, format, parseISO, startOfDay } from "date-fns";
import { Loader2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import {
  getEventLocationType,
  getTranslatedLocation,
  isAttendeeInputRequired,
  JitsiLocationType,
} from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { BookingFields } from "@calcom/features/bookings/Booker/components/BookEventForm/BookingFields";
import {
  createRecurringBooking,
  mapRecurringBookingToMutationInput,
  useTimePreferences,
} from "@calcom/features/bookings/lib";
import { SystemField } from "@calcom/features/bookings/lib/SystemField";
import { createBooking } from "@calcom/features/bookings/lib/create-booking";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringDates, processDate } from "@calcom/lib/parse-dates";
import { getCountText, getFrequencyText, getRecurringFreq } from "@calcom/lib/recurringStrings";
import { trpc } from "@calcom/trpc/react";

import type { Contact } from "../types";
import { MeetingStepIndicator } from "./MeetingStepIndicator";
import { HANDLED_BOOKING_FIELD_NAMES } from "./ScheduleMeetingModal.constants";
import {
  getIssueFieldName,
  isFieldVisibleInBookingView,
  normalizeBookingResponses,
} from "./ScheduleMeetingModal.utils";
import { ScheduleMeetingModalBookingFieldsStep } from "./ScheduleMeetingModalBookingFieldsStep";
import { ScheduleMeetingModalConfirmStep } from "./ScheduleMeetingModalConfirmStep";
import { ScheduleMeetingModalDateTimeStep } from "./ScheduleMeetingModalDateTimeStep";
import { ScheduleMeetingModalEventTypeStep } from "./ScheduleMeetingModalEventTypeStep";
import { ScheduleMeetingModalGuestsStep } from "./ScheduleMeetingModalGuestsStep";
import { ScheduleMeetingModalLocationStep } from "./ScheduleMeetingModalLocationStep";

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

type BookingFieldsFormValues = {
  responses: Record<string, unknown>;
};

export const ScheduleMeetingModal = ({ open, onOpenChange, contact }: ScheduleMeetingModalProps) => {
  const { i18n, t } = useLocale();
  const utils = trpc.useUtils();
  const timeFormat = useTimePreferences((state) => state.timeFormat);
  const setTimeFormat = useTimePreferences((state) => state.setTimeFormat);

  const [step, setStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedLocationType, setSelectedLocationType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [additionalGuests, setAdditionalGuests] = useState("");
  const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(null);
  const [recurringEventCount, setRecurringEventCount] = useState<number | null>(null);
  const [recurringEventCountInput, setRecurringEventCountInput] = useState<string>("");
  const [recurringEventCountWarning, setRecurringEventCountWarning] = useState<string | null>(null);

  const bookingFieldsForm = useForm<BookingFieldsFormValues>({
    defaultValues: {
      responses: {},
    },
  });

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const eventTypesQuery = trpc.viewer.eventTypes.list.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const selectedEventQuery = trpc.viewer.eventTypes.get.useQuery(
    {
      id: selectedEventId ?? 0,
    },
    {
      enabled: open && selectedEventId !== null,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const selectedEventInfo = useMemo(
    () => eventTypesQuery.data?.find((eventType) => eventType.id === selectedEventId) ?? null,
    [eventTypesQuery.data, selectedEventId]
  );

  const selectedEventDetail = selectedEventQuery.data?.eventType;
  const recurringEventConfig = selectedEventDetail?.recurringEvent ?? null;
  const isRecurringEventType = recurringEventConfig !== null && typeof recurringEventConfig.freq === "number";
  const recurringMaxCount = recurringEventConfig?.count ?? null;
  const selectedEventLocations = useMemo(
    () =>
      Array.isArray(selectedEventDetail?.locations) && selectedEventDetail.locations.length > 0
        ? selectedEventDetail.locations
        : [{ type: JitsiLocationType }],
    [selectedEventDetail?.locations]
  );

  const bookingFieldsStepSource = useMemo(() => {
    if (!selectedEventDetail) {
      return [];
    }

    return selectedEventDetail.bookingFields.filter((field) => {
      if (field.hidden) {
        return false;
      }

      if (field.name === SystemField.Enum.rescheduleReason) {
        return false;
      }

      if (!isFieldVisibleInBookingView(field.views)) {
        return false;
      }

      return !HANDLED_BOOKING_FIELD_NAMES.has(field?.name);
    });
  }, [selectedEventDetail]);

  const bookingFieldsStepFields = useMemo(
    () => bookingFieldsStepSource.map((field) => ({ ...field, views: undefined })),
    [bookingFieldsStepSource]
  );

  const hasExtendedBookingFields = bookingFieldsStepSource.length > 0;
  const hasLocationSelectionStep = selectedEventLocations.length > 1;
  const locationOptions = useMemo(
    () =>
      selectedEventLocations.map((location) => {
        const locationType = getEventLocationType(location.type);
        const locationLabel = getTranslatedLocation(location, locationType, t) ?? location.type;
        return {
          type: location.type,
          label: locationLabel,
        };
      }),
    [selectedEventLocations, t]
  );
  const stepLabels = useMemo(() => {
    const labels = ["Event Type"];
    if (hasLocationSelectionStep) {
      labels.push("Location");
    }
    labels.push("Date & Time");
    if (hasExtendedBookingFields) {
      labels.push("Booking Fields");
    }
    labels.push("Guests", "Confirm");
    return labels;
  }, [hasExtendedBookingFields, hasLocationSelectionStep]);

  const EVENT_TYPE_STEP = 1;
  const LOCATION_STEP = hasLocationSelectionStep ? 2 : null;
  const DATE_TIME_STEP = hasLocationSelectionStep ? 3 : 2;
  const BOOKING_FIELDS_STEP = hasExtendedBookingFields ? DATE_TIME_STEP + 1 : null;
  const GUESTS_STEP = hasExtendedBookingFields ? (BOOKING_FIELDS_STEP as number) + 1 : DATE_TIME_STEP + 1;
  const CONFIRM_STEP = GUESTS_STEP + 1;
  const BACK_FROM_GUESTS_STEP = hasExtendedBookingFields ? BOOKING_FIELDS_STEP : DATE_TIME_STEP;

  const defaultBookingFieldResponses = useMemo(() => {
    return bookingFieldsStepSource.reduce<Record<string, unknown>>((defaults, field) => {
      if (field?.name === SystemField.Enum.attendeePhoneNumber && contact?.phone?.trim()) {
        defaults[field?.name] = contact.phone.trim();
      }
      return defaults;
    }, {});
  }, [bookingFieldsStepSource, contact?.phone]);

  useEffect(() => {
    bookingFieldsForm.reset({
      responses: defaultBookingFieldResponses,
    });
  }, [bookingFieldsForm, defaultBookingFieldResponses]);

  useEffect(() => {
    if (!isRecurringEventType) {
      setRecurringEventCount(null);
      setRecurringEventCountInput("");
      setRecurringEventCountWarning(null);
      return;
    }

    const defaultRecurringCount = recurringMaxCount ?? 1;
    setRecurringEventCount(defaultRecurringCount);
    setRecurringEventCountInput(String(defaultRecurringCount));
    setRecurringEventCountWarning(null);
  }, [isRecurringEventType, recurringMaxCount, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedLocationType(null);
      return;
    }

    const defaultLocationType = selectedEventLocations.at(0)?.type ?? null;
    if (!defaultLocationType) {
      setSelectedLocationType(null);
      return;
    }

    const isSelectedLocationStillValid = selectedEventLocations.some(
      (location) => location.type === selectedLocationType
    );
    if (!selectedLocationType || !isSelectedLocationStillValid) {
      setSelectedLocationType(defaultLocationType);
    }
  }, [selectedEventId, selectedEventLocations, selectedLocationType]);

  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const durationOptions = useMemo(() => {
    const fallbackDuration = selectedEventDetail?.length ?? selectedEventInfo?.length ?? null;
    const multipleDuration = selectedEventDetail?.metadata?.multipleDuration;

    const validMultipleDurations = Array.isArray(multipleDuration)
      ? multipleDuration.filter((duration): duration is number => Number.isFinite(duration) && duration > 0)
      : [];

    const uniqueDurations = Array.from(
      new Set([...(fallbackDuration ? [fallbackDuration] : []), ...validMultipleDurations])
    ).sort((first, second) => first - second);

    return uniqueDurations;
  }, [
    selectedEventDetail?.length,
    selectedEventDetail?.metadata?.multipleDuration,
    selectedEventInfo?.length,
  ]);

  useEffect(() => {
    if (durationOptions.length === 0) {
      setSelectedDuration(null);
      return;
    }

    if (!selectedDuration || !durationOptions.includes(selectedDuration)) {
      setSelectedDuration(durationOptions[0]);
      setSelectedSlotTime(null);
    }
  }, [durationOptions, selectedDuration]);

  const slotsInput = selectedDate
    ? {
        eventTypeId: selectedEventId ?? 0,
        startTime: startOfDay(selectedDate).toISOString(),
        endTime: addMinutes(startOfDay(selectedDate), 24 * 60 - 1).toISOString(),
        timeZone: userTimeZone,
        ...(selectedDuration ? { duration: `${selectedDuration}` } : {}),
      }
    : {
        eventTypeId: selectedEventId ?? 0,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        timeZone: userTimeZone,
        ...(selectedDuration ? { duration: `${selectedDuration}` } : {}),
      };

  const slotsQuery = trpc.viewer.slots.getSchedule.useQuery(slotsInput, {
    enabled: open && selectedEventId !== null && Boolean(selectedDate) && Boolean(selectedDuration),
    refetchOnWindowFocus: false,
  });

  const availableSlots = useMemo(() => {
    if (!selectedDateKey) {
      return [];
    }

    const slotsForDay = slotsQuery.data?.slots[selectedDateKey] ?? [];

    return slotsForDay
      .filter((slot) => !slot.away)
      .slice()
      .sort((first, second) => first.time.localeCompare(second.time));
  }, [selectedDateKey, slotsQuery.data?.slots]);

  const recurringPatternText = useMemo(() => {
    if (!isRecurringEventType || !recurringEventConfig) {
      return null;
    }
    const recurringDescription = getRecurringFreq({ t, recurringEvent: recurringEventConfig }).trim();
    if (recurringDescription) {
      return recurringDescription;
    }
    return getFrequencyText(recurringEventConfig.freq, recurringEventConfig.interval || 1);
  }, [isRecurringEventType, recurringEventConfig, t]);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationType) {
      return selectedEventLocations.at(0) ?? null;
    }
    return selectedEventLocations.find((location) => location.type === selectedLocationType) ?? null;
  }, [selectedEventLocations, selectedLocationType]);

  const selectedLocationLabel = useMemo(() => {
    if (!selectedLocation) {
      return null;
    }

    const eventLocationType = getEventLocationType(selectedLocation.type);
    return getTranslatedLocation(selectedLocation, eventLocationType, t);
  }, [selectedLocation, t]);

  const locationFallbackNotice = useMemo(() => {
    if (
      !selectedEventDetail ||
      (Array.isArray(selectedEventDetail.locations) && selectedEventDetail.locations.length > 0)
    ) {
      return null;
    }
    return "This event type has no configured location. Jitsi will be used by default.";
  }, [selectedEventDetail]);

  const recurringSummaryText = useMemo(() => {
    if (
      !isRecurringEventType ||
      !recurringEventConfig ||
      !selectedSlotTime ||
      !recurringEventCount ||
      recurringEventCountWarning
    ) {
      return null;
    }

    const formattedStart = processDate(
      dayjs(selectedSlotTime).tz(userTimeZone),
      i18n.language,
      userTimeZone,
      {
        selectedTimeFormat: timeFormat,
      }
    );

    const frequencyText = getFrequencyText(recurringEventConfig.freq, recurringEventConfig.interval || 1);
    const countText = getCountText(recurringEventCount);
    return `Repeats ${frequencyText} ${countText} starting from ${formattedStart}`;
  }, [
    i18n.language,
    isRecurringEventType,
    recurringEventConfig,
    recurringEventCount,
    recurringEventCountWarning,
    selectedSlotTime,
    timeFormat,
    userTimeZone,
  ]);

  const recurringOccurrencePreview = useMemo(() => {
    if (
      !isRecurringEventType ||
      !recurringEventConfig ||
      !selectedSlotTime ||
      !recurringEventCount ||
      recurringEventCountWarning
    ) {
      return [];
    }

    try {
      const [occurrenceDateStrings] = parseRecurringDates(
        {
          startDate: selectedSlotTime,
          timeZone: userTimeZone,
          recurringEvent: recurringEventConfig,
          recurringCount: recurringEventCount,
          selectedTimeFormat: timeFormat,
        },
        i18n.language
      );

      return occurrenceDateStrings.slice(0, 6);
    } catch {
      return [];
    }
  }, [
    i18n.language,
    isRecurringEventType,
    recurringEventConfig,
    recurringEventCount,
    recurringEventCountWarning,
    selectedSlotTime,
    timeFormat,
    userTimeZone,
  ]);
  const isRecurringSelectionValid =
    !isRecurringEventType || (Boolean(recurringEventCount) && !recurringEventCountWarning);

  const unsupportedReason = useMemo(() => {
    if (!selectedEventDetail || !contact) {
      return null;
    }

    const paymentAppData = getPaymentAppData(selectedEventDetail);
    const isPaidEventType =
      selectedEventDetail.price > 0 && !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0;

    if (isPaidEventType) {
      return "Paid event types are not supported in Contacts scheduling yet.";
    }

    const locationField = selectedEventDetail.bookingFields.find(
      (field) => field && field.name === SystemField.Enum.location && field.required && !field.hidden
    );
    if (locationField && selectedLocation) {
      const attendeeInputType = isAttendeeInputRequired(selectedLocation.type);

      if (attendeeInputType === "phone" && !contact.phone.trim()) {
        return "This event type requires attendee phone, but this contact has no phone number.";
      }

      if (attendeeInputType && attendeeInputType !== "phone") {
        return "This event type requires attendee-provided location details that are not supported in Contacts scheduling yet.";
      }
    }

    return null;
  }, [contact, selectedEventDetail, selectedLocation]);

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    async onSuccess() {
      if (!contact) {
        return;
      }

      await Promise.all([
        utils.viewer.calIdContacts.list.invalidate(),
        utils.viewer.calIdContacts.getById.invalidate({ id: contact.id }),
        utils.viewer.calIdContacts.getMeetingsByContactId.invalidate({ contactId: contact.id }),
      ]);
    },
  });

  const createRecurringBookingMutation = useMutation({
    mutationFn: createRecurringBooking,
    async onSuccess() {
      if (!contact) {
        return;
      }

      await Promise.all([
        utils.viewer.calIdContacts.list.invalidate(),
        utils.viewer.calIdContacts.getById.invalidate({ id: contact.id }),
        utils.viewer.calIdContacts.getMeetingsByContactId.invalidate({ contactId: contact.id }),
      ]);
    },
  });
  const isAnyBookingMutationPending =
    createBookingMutation.isPending || createRecurringBookingMutation.isPending;

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(EVENT_TYPE_STEP);
      setSelectedEventId(null);
      setSelectedLocationType(null);
      setSelectedDate(undefined);
      setSelectedDuration(null);
      setSelectedSlotTime(null);
      setAdditionalGuests("");
      setBookingErrorMessage(null);
      setRecurringEventCount(null);
      setRecurringEventCountInput("");
      setRecurringEventCountWarning(null);
      bookingFieldsForm.reset({ responses: {} });
      createBookingMutation.reset();
      createRecurringBookingMutation.reset();
    }

    onOpenChange(nextOpen);
  };

  const validateBookingFields = async (responses: Record<string, unknown>) => {
    if (bookingFieldsStepSource.length === 0) {
      bookingFieldsForm.clearErrors("responses");
      return true;
    }
    if (!contact) {
      return false;
    }

    const normalizedResponses = normalizeBookingResponses(responses);

    const schema = getBookingResponsesSchema({
      bookingFields: bookingFieldsStepSource,
      view: "booking",
    });

    const responsesForValidation: Record<string, unknown> = {
      name: contact.name,
      email: contact.email,
      ...normalizedResponses,
    };

    const validation = await schema.safeParseAsync(responsesForValidation);
    bookingFieldsForm.clearErrors("responses");

    if (!validation.success) {
      const bookingFieldStepNames = new Set(bookingFieldsStepSource.map((field) => field?.name));
      const relevantIssue =
        validation.error.issues.find((issue) => {
          const issueFieldName = getIssueFieldName(issue.message);
          return Boolean(issueFieldName && bookingFieldStepNames.has(issueFieldName));
        }) ?? null;

      if (!relevantIssue) {
        return true;
      }

      const issueMessage = relevantIssue.message ?? "error_required_field";
      bookingFieldsForm.setError("responses", {
        type: "manual",
        message: issueMessage,
      });
      return false;
    }

    return true;
  };

  const handleBookingFieldsNext = async () => {
    setBookingErrorMessage(null);
    const responses = normalizeBookingResponses(bookingFieldsForm.getValues("responses") ?? {});
    const isValid = await validateBookingFields(responses);
    if (!isValid) {
      setBookingErrorMessage("Please complete the required booking fields before continuing.");
      return;
    }

    setStep(GUESTS_STEP);
  };

  const handleRecurringCountInputChange = (value: string) => {
    setRecurringEventCountInput(value);

    if (!isRecurringEventType) {
      setRecurringEventCount(null);
      setRecurringEventCountWarning(null);
      return;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (!value || Number.isNaN(parsedValue)) {
      setRecurringEventCount(null);
      setRecurringEventCountWarning("Please enter a valid occurrence count.");
      return;
    }

    if (parsedValue < 1) {
      setRecurringEventCount(parsedValue);
      setRecurringEventCountWarning("Occurrence count must be at least 1.");
      return;
    }

    if (recurringMaxCount && parsedValue > recurringMaxCount) {
      setRecurringEventCount(parsedValue);
      setRecurringEventCountWarning(`Enter a value between 1 and ${recurringMaxCount}.`);
      return;
    }

    setRecurringEventCount(parsedValue);
    setRecurringEventCountWarning(null);
  };

  const handleConfirm = async () => {
    if (!contact || !selectedEventInfo || !selectedSlotTime) {
      return;
    }

    if (unsupportedReason) {
      setBookingErrorMessage(unsupportedReason);
      return;
    }

    setBookingErrorMessage(null);

    const guestEmails = additionalGuests
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const invalidGuestEmails = guestEmails.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    if (invalidGuestEmails.length > 0) {
      setBookingErrorMessage("One or more additional guest emails are invalid.");
      setStep(GUESTS_STEP);
      return;
    }

    const selectedStart = parseISO(selectedSlotTime);
    if (Number.isNaN(selectedStart.getTime())) {
      setBookingErrorMessage("The selected time slot is invalid. Please choose another slot.");
      setStep(DATE_TIME_STEP);
      return;
    }

    const duration = selectedDuration ?? selectedEventDetail?.length ?? selectedEventInfo.length;
    const bookingFieldResponses = normalizeBookingResponses(bookingFieldsForm.getValues("responses") ?? {});

    let responses: Record<string, unknown> = {
      ...bookingFieldResponses,
      name: contact.name,
      email: contact.email,
      ...(guestEmails.length > 0 ? { guests: guestEmails } : {}),
    };

    const hasAttendeePhoneField = selectedEventDetail?.bookingFields.some(
      (field) => field?.name === SystemField.Enum.attendeePhoneNumber
    );
    const attendeePhoneValue =
      typeof responses[SystemField.Enum.attendeePhoneNumber] === "string"
        ? responses[SystemField.Enum.attendeePhoneNumber]
        : "";
    if (hasAttendeePhoneField && !attendeePhoneValue && contact.phone.trim()) {
      responses[SystemField.Enum.attendeePhoneNumber] = contact.phone.trim();
    }

    const locationField = selectedEventDetail?.bookingFields.find(
      (field) => field?.name === SystemField.Enum.location && !field.hidden
    );
    if (locationField && selectedLocation) {
      const attendeeInputType = isAttendeeInputRequired(selectedLocation.type);

      const attendeePhoneValueForLocation =
        typeof responses[SystemField.Enum.attendeePhoneNumber] === "string"
          ? responses[SystemField.Enum.attendeePhoneNumber]
          : contact.phone.trim();
      responses[SystemField.Enum.location] = {
        value: selectedLocation.type,
        optionValue: attendeeInputType === "phone" ? attendeePhoneValueForLocation : "",
      };
    }

    if (selectedEventDetail) {
      const fullSchema = getBookingResponsesSchema({
        bookingFields: selectedEventDetail.bookingFields,
        view: "booking",
      });
      const parsedResponses = await fullSchema.safeParseAsync(normalizeBookingResponses(responses));

      if (!parsedResponses.success) {
        const issueMessage = parsedResponses.error.issues[0]?.message ?? "error_required_field";
        const issueFieldName = getIssueFieldName(issueMessage);
        if (issueFieldName && bookingFieldsStepSource.some((field) => field.name === issueFieldName)) {
          bookingFieldsForm.setError("responses", {
            type: "manual",
            message: issueMessage,
          });
          if (BOOKING_FIELDS_STEP) {
            setStep(BOOKING_FIELDS_STEP);
          }
        }

        setBookingErrorMessage("Please complete the required booking fields before confirming.");
        return;
      }

      responses = parsedResponses.data;
    }

    const username = selectedEventDetail?.users?.at(0)?.username || undefined;
    try {
      if (isRecurringEventType && recurringEventConfig) {
        const finalRecurringCount =
          recurringEventCount ?? recurringMaxCount ?? recurringEventConfig.count ?? null;
        if (!finalRecurringCount || recurringEventCountWarning) {
          setBookingErrorMessage("Please provide a valid occurrence count for this recurring event.");
          setStep(DATE_TIME_STEP);
          return;
        }

        const recurringBookingInput = mapRecurringBookingToMutationInput(
          {
            values: {
              responses,
            },
            event: {
              id: selectedEventInfo.id,
              length: selectedEventDetail?.length ?? selectedEventInfo.length,
              slug: selectedEventInfo.slug,
              schedulingType: selectedEventDetail?.schedulingType,
              recurringEvent: recurringEventConfig,
            },
            date: selectedSlotTime,
            duration,
            timeZone: userTimeZone,
            language: i18n.language || "en",
            rescheduleUid: undefined,
            rescheduledBy: undefined,
            username: username ?? "",
            metadata: {},
          },
          finalRecurringCount
        );

        await createRecurringBookingMutation.mutateAsync([recurringBookingInput]);

        triggerToast(
          `Recurring meeting with ${contact.name} confirmed (${finalRecurringCount} occurrences).`,
          "success"
        );
      } else {
        await createBookingMutation.mutateAsync({
          eventTypeId: selectedEventInfo.id,
          eventTypeSlug: selectedEventInfo.slug,
          user: username ?? undefined,
          start: selectedStart.toISOString(),
          end: addMinutes(selectedStart, duration).toISOString(),
          timeZone: userTimeZone,
          language: i18n.language || "en",
          metadata: {},
          responses,
        });

        triggerToast(
          `Meeting with ${contact.name} confirmed for ${format(selectedStart, "PPP")} at ${format(
            selectedStart,
            timeFormat
          )}.`,
          "success"
        );
      }

      resetAndClose(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not schedule meeting";
      setBookingErrorMessage(message);
      triggerToast(message, "error");
    }
  };

  const handleSelectEventType = (eventTypeId: number) => {
    setSelectedEventId(eventTypeId);
    setSelectedLocationType(null);
    setSelectedDate(undefined);
    setSelectedDuration(null);
    setSelectedSlotTime(null);
    setAdditionalGuests("");
    setBookingErrorMessage(null);
    bookingFieldsForm.reset({ responses: {} });
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent size="md" className="flex max-h-[90vh] max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Video className="h-4 w-4" />
            Schedule Meeting {contact ? `with ${contact.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        <MeetingStepIndicator step={step} steps={stepLabels} />

        {step === EVENT_TYPE_STEP ? (
          <ScheduleMeetingModalEventTypeStep
            eventTypes={eventTypesQuery.data ?? []}
            selectedEventId={selectedEventId}
            onSelectEventType={handleSelectEventType}
            isEventTypesLoading={eventTypesQuery.isLoading}
            eventTypesErrorMessage={eventTypesQuery.isError ? eventTypesQuery.error.message : null}
            onRetryEventTypes={() => {
              void eventTypesQuery.refetch();
            }}
            isSelectedEventLoading={selectedEventId !== null && selectedEventQuery.isLoading}
            selectedEventErrorMessage={selectedEventQuery.isError ? selectedEventQuery.error.message : null}
            unsupportedReason={unsupportedReason}
            isNextDisabled={
              selectedEventId === null ||
              selectedEventQuery.isLoading ||
              selectedEventQuery.isError ||
              Boolean(unsupportedReason)
            }
            onNext={() => {
              setBookingErrorMessage(null);
              if (LOCATION_STEP) {
                setStep(LOCATION_STEP);
                return;
              }
              setStep(DATE_TIME_STEP);
            }}
          />
        ) : null}

        {LOCATION_STEP && step === LOCATION_STEP ? (
          <ScheduleMeetingModalLocationStep
            locationOptions={locationOptions}
            selectedLocationType={selectedLocationType}
            onSelectLocationType={setSelectedLocationType}
            fallbackNotice={locationFallbackNotice}
            unsupportedReason={unsupportedReason}
            onBack={() => {
              setBookingErrorMessage(null);
              setStep(EVENT_TYPE_STEP);
            }}
            onNext={() => {
              setBookingErrorMessage(null);
              setStep(DATE_TIME_STEP);
            }}
          />
        ) : null}

        {step === DATE_TIME_STEP ? (
          <ScheduleMeetingModalDateTimeStep
            selectedDate={selectedDate}
            onSelectDate={(value) => {
              setSelectedDate(value);
              setSelectedSlotTime(null);
            }}
            selectedDuration={selectedDuration}
            durationOptions={durationOptions}
            onSelectDuration={(nextDuration) => {
              setSelectedDuration(nextDuration);
              setSelectedSlotTime(null);
            }}
            selectedSlotTime={selectedSlotTime}
            onSelectSlotTime={setSelectedSlotTime}
            availableSlots={availableSlots}
            isDurationLoading={selectedDate ? selectedEventQuery.isLoading : false}
            durationErrorMessage={
              selectedDate && selectedEventQuery.isError ? selectedEventQuery.error.message : null
            }
            isSlotsLoading={slotsQuery.isLoading}
            slotsErrorMessage={slotsQuery.isError ? slotsQuery.error.message : null}
            onRetrySlots={() => {
              void slotsQuery.refetch();
            }}
            timeFormat={timeFormat}
            onTimeFormatChange={setTimeFormat}
            timeFormat12hLabel={t("12_hour_short") || "12h"}
            timeFormat24hLabel={t("24_hour_short") || "24h"}
            isRecurringEventType={isRecurringEventType}
            recurringPatternText={recurringPatternText}
            recurringMaxCount={recurringMaxCount}
            recurringEventCountInput={recurringEventCountInput}
            onRecurringCountInputChange={handleRecurringCountInputChange}
            recurringEventCountWarning={recurringEventCountWarning}
            recurringSummaryText={recurringSummaryText}
            recurringOccurrencePreview={recurringOccurrencePreview}
            recurringEventCount={recurringEventCount}
            isRecurringSelectionValid={isRecurringSelectionValid}
            canContinue={Boolean(selectedDate && selectedDuration && selectedSlotTime)}
            onBack={() => {
              setBookingErrorMessage(null);
              setStep(LOCATION_STEP ?? EVENT_TYPE_STEP);
            }}
            onNext={() => {
              setBookingErrorMessage(null);
              setStep(BOOKING_FIELDS_STEP ?? GUESTS_STEP);
            }}
          />
        ) : null}

        {hasExtendedBookingFields && step === BOOKING_FIELDS_STEP ? (
          <ScheduleMeetingModalBookingFieldsStep
            isLoading={selectedEventQuery.isLoading}
            errorMessage={selectedEventQuery.isError ? selectedEventQuery.error.message : null}
            onRetry={() => {
              void selectedEventQuery.refetch();
            }}
            bookingErrorMessage={bookingErrorMessage}
            onBack={() => {
              setBookingErrorMessage(null);
              setStep(DATE_TIME_STEP);
            }}
            onNext={handleBookingFieldsNext}
            nextDisabled={selectedEventQuery.isLoading || selectedEventQuery.isError}>
            <FormProvider {...bookingFieldsForm}>
              <BookingFields
                isDynamicGroupBooking={false}
                fields={bookingFieldsStepFields}
                locations={selectedEventDetail?.locations ?? []}
                bookingData={null}
              />
            </FormProvider>
          </ScheduleMeetingModalBookingFieldsStep>
        ) : null}

        {step === GUESTS_STEP ? (
          <ScheduleMeetingModalGuestsStep
            contactName={contact?.name}
            contactEmail={contact?.email}
            additionalGuests={additionalGuests}
            onAdditionalGuestsChange={setAdditionalGuests}
            bookingErrorMessage={bookingErrorMessage}
            onBack={() => {
              setBookingErrorMessage(null);
              if (BACK_FROM_GUESTS_STEP) {
                setStep(BACK_FROM_GUESTS_STEP);
              }
            }}
            onNext={() => {
              setBookingErrorMessage(null);
              setStep(CONFIRM_STEP);
            }}
          />
        ) : null}

        {step === CONFIRM_STEP ? (
          <ScheduleMeetingModalConfirmStep
            selectedEventTitle={selectedEventInfo?.title}
            selectedLocation={selectedLocationLabel}
            selectedDate={selectedDate}
            selectedSlotTime={selectedSlotTime}
            selectedDuration={selectedDuration ?? selectedEventDetail?.length ?? 0}
            isRecurringEventType={isRecurringEventType}
            recurringPatternText={recurringPatternText}
            recurringEventCountText={recurringEventCount ?? recurringMaxCount ?? "-"}
            contactName={contact?.name}
            additionalGuests={additionalGuests}
            bookingErrorMessage={bookingErrorMessage}
            isSubmitting={isAnyBookingMutationPending}
            isConfirmDisabled={isAnyBookingMutationPending || Boolean(unsupportedReason)}
            timeFormat={timeFormat}
            onBack={() => {
              setBookingErrorMessage(null);
              setStep(GUESTS_STEP);
            }}
            onConfirm={handleConfirm}
          />
        ) : null}

        {selectedEventId !== null && selectedEventQuery.isLoading && step !== EVENT_TYPE_STEP ? (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading event details...
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
