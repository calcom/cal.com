import type { EventType } from "../../../services/calcom";
import type { LocationItem } from "../../../types/locations";
import { mapItemToApiLocation } from "../../../utils/locationHelpers";
import {
  parseBufferTime,
  parseMinimumNotice,
  parseFrequencyUnit,
  parseSlotInterval,
} from "../../../utils/eventTypeParsers";

interface FrequencyLimit {
  id: number;
  value: string;
  unit: string;
}

interface EventTypeFormState {
  eventTitle: string;
  eventSlug: string;
  eventDescription: string;
  eventDuration: string;
  isHidden: boolean;
  locations: LocationItem[];
  disableGuests: boolean;
  allowMultipleDurations: boolean;
  selectedDurations: string[];
  defaultDuration: string;
  selectedScheduleId?: number;
  beforeEventBuffer: string;
  afterEventBuffer: string;
  minimumNoticeValue: string;
  minimumNoticeUnit: string;
  slotInterval: string;
  limitBookingFrequency: boolean;
  frequencyLimits: FrequencyLimit[];
  limitTotalDuration: boolean;
  durationLimits: FrequencyLimit[];
  onlyShowFirstAvailableSlot: boolean;
  maxActiveBookingsPerBooker: boolean;
  maxActiveBookingsValue: string;
  offerReschedule: boolean;
  limitFutureBookings: boolean;
  futureBookingType: "rolling" | "range";
  rollingDays: string;
  rollingCalendarDays: boolean;
  rangeStartDate: string;
  rangeEndDate: string;

  // Advanced
  requiresConfirmation: boolean;
  requiresBookerEmailVerification: boolean;
  hideCalendarNotes: boolean;
  hideCalendarEventDetails: boolean;
  hideOrganizerEmail: boolean;
  lockTimezone: boolean;
  allowReschedulingPastEvents: boolean;
  allowBookingThroughRescheduleLink: boolean;
  successRedirectUrl: string;
  forwardParamsSuccessRedirect: boolean;
  customReplyToEmail: string;
  eventTypeColorLight: string;
  eventTypeColorDark: string;
  calendarEventName: string;
  addToCalendarEmail: string;
  selectedLayouts: string[];
  defaultLayout: string;
  disableCancelling: boolean;
  disableRescheduling: boolean;
  sendCalVideoTranscription: boolean;
  autoTranslate: boolean;

  // Seats
  seatsEnabled: boolean;
  seatsPerTimeSlot: string;
  showAttendeeInfo: boolean;
  showAvailabilityCount: boolean;

  // Recurring
  recurringEnabled: boolean;
  recurringInterval: string;
  recurringFrequency: "weekly" | "monthly" | "yearly";
  recurringOccurrences: string;
}

function parseDurationString(duration: string): number {
  const match = duration.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function hasMultipleDurationsChanged(
  enabled: boolean,
  selectedDurations: string[],
  defaultDuration: string,
  mainDuration: string,
  original: any
): boolean {
  const originalOptions = original?.lengthInMinutesOptions;
  const originalHasMultiple =
    originalOptions && Array.isArray(originalOptions) && originalOptions.length > 0;

  if (!enabled && !originalHasMultiple) return false;
  if (!enabled && originalHasMultiple) return true;
  if (enabled && !originalHasMultiple) return true;

  const currentDurations = selectedDurations.map(parseDurationString).sort((a, b) => a - b);
  const originalDurations = [...originalOptions].sort((a: number, b: number) => a - b);

  if (!deepEqual(currentDurations, originalDurations)) return true;

  // Also check if the default (main) duration changed
  const currentDefault = parseDurationString(defaultDuration || mainDuration);
  const originalDefault = original?.lengthInMinutes;

  return currentDefault !== originalDefault;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

function normalizeLocation(loc: any): any {
  if (!loc) return null;

  const normalized: any = { type: loc.type };

  if (loc.type === "integration") {
    normalized.integration = loc.integration;
  } else if (loc.type === "address") {
    normalized.address = loc.address || "";
    if (loc.public !== undefined) normalized.public = loc.public;
  } else if (loc.type === "link") {
    normalized.link = loc.link || "";
    if (loc.public !== undefined) normalized.public = loc.public;
  } else if (loc.type === "phone") {
    normalized.phone = loc.phone || "";
    if (loc.public !== undefined) normalized.public = loc.public;
  }

  return normalized;
}

function haveLocationsChanged(
  currentLocations: LocationItem[],
  originalLocations: any[] | undefined
): boolean {
  if ((!originalLocations || originalLocations.length === 0) && currentLocations.length === 0) {
    return false;
  }
  if (!originalLocations && currentLocations.length > 0) return true;
  if (originalLocations && currentLocations.length !== originalLocations.length) return true;

  const currentMapped = currentLocations.map((loc) => normalizeLocation(mapItemToApiLocation(loc)));
  const originalMapped = originalLocations!.map((loc) => normalizeLocation(loc));

  const sortByType = (a: any, b: any) => (a?.type || "").localeCompare(b?.type || "");
  currentMapped.sort(sortByType);
  originalMapped.sort(sortByType);

  return !deepEqual(currentMapped, originalMapped);
}

function hasBookingLimitsCountChanged(
  enabled: boolean,
  limits: FrequencyLimit[],
  original: any
): boolean {
  const originalIsDisabled =
    !original ||
    original.disabled === true ||
    Object.keys(original).length === 0 ||
    (Object.keys(original).length === 1 && original.disabled !== undefined);

  if (!enabled && originalIsDisabled) return false;
  if (!enabled && !originalIsDisabled) return true;
  if (enabled && originalIsDisabled) return true;

  const currentLimits: Record<string, number> = {};
  limits.forEach((limit) => {
    const unit = parseFrequencyUnit(limit.unit);
    if (unit) {
      currentLimits[unit] = parseInt(limit.value) || 1;
    }
  });

  const originalLimits: Record<string, number> = {};
  if (original) {
    Object.keys(original).forEach((key) => {
      if (key !== "disabled" && typeof original[key] === "number") {
        originalLimits[key] = original[key];
      }
    });
  }

  return !deepEqual(currentLimits, originalLimits);
}

function hasBookingLimitsDurationChanged(
  enabled: boolean,
  limits: FrequencyLimit[],
  original: any
): boolean {
  const originalIsDisabled =
    !original ||
    original.disabled === true ||
    Object.keys(original).length === 0 ||
    (Object.keys(original).length === 1 && original.disabled !== undefined);

  if (!enabled && originalIsDisabled) return false;
  if (!enabled && !originalIsDisabled) return true;
  if (enabled && originalIsDisabled) return true;

  const currentLimits: Record<string, number> = {};
  limits.forEach((limit) => {
    const unit = parseFrequencyUnit(limit.unit);
    if (unit) {
      currentLimits[unit] = parseInt(limit.value) || 60;
    }
  });

  const originalLimits: Record<string, number> = {};
  if (original) {
    Object.keys(original).forEach((key) => {
      if (key !== "disabled" && typeof original[key] === "number") {
        originalLimits[key] = original[key];
      }
    });
  }

  return !deepEqual(currentLimits, originalLimits);
}

function hasBookingWindowChanged(
  enabled: boolean,
  type: "rolling" | "range",
  rollingDays: string,
  calendarDays: boolean,
  rangeStart: string,
  rangeEnd: string,
  original: any
): boolean {
  const originalDisabled = !original || original.disabled;

  if (!enabled && originalDisabled) return false;
  if (!enabled && !originalDisabled) return true;
  if (enabled && originalDisabled) return true;

  if (type === "range") {
    if (original.type !== "range") return true;
    const originalValue = original.value;
    if (!Array.isArray(originalValue)) return true;
    return originalValue[0] !== rangeStart || originalValue[1] !== rangeEnd;
  } else {
    const expectedType = calendarDays ? "calendarDays" : "businessDays";
    if (original.type !== expectedType) return true;
    return original.value !== parseInt(rollingDays);
  }
}

function hasBookerActiveBookingsLimitChanged(
  enabled: boolean,
  value: string,
  offerReschedule: boolean,
  original: any
): boolean {
  const originalDisabled = !original || original.disabled;

  if (!enabled && originalDisabled) return false;
  if (!enabled && !originalDisabled) return true;
  if (enabled && originalDisabled) return true;

  const originalMax = original.maximumActiveBookings ?? original.count;
  return originalMax !== parseInt(value) || original.offerReschedule !== offerReschedule;
}

function hasRecurrenceChanged(
  enabled: boolean,
  interval: string,
  frequency: string,
  occurrences: string,
  original: any
): boolean {
  const originalDisabled = !original || original.disabled === true;

  if (!enabled && originalDisabled) return false;
  if (!enabled && !originalDisabled) return true;
  if (enabled && originalDisabled) return true;

  return (
    original.interval !== parseInt(interval) ||
    original.frequency !== frequency ||
    original.occurrences !== parseInt(occurrences)
  );
}

function hasSeatsChanged(
  enabled: boolean,
  perTimeSlot: string,
  showAttendee: boolean,
  showAvailability: boolean,
  original: any
): boolean {
  const originalDisabled = !original || original.disabled === true;
  const originalEnabled =
    original &&
    (original.disabled === false || (!("disabled" in original) && original.seatsPerTimeSlot));

  if (!enabled && originalDisabled) return false;
  if (!enabled && originalEnabled) return true;
  if (enabled && originalDisabled) return true;

  return (
    original.seatsPerTimeSlot !== parseInt(perTimeSlot) ||
    original.showAttendeeInfo !== showAttendee ||
    original.showAvailabilityCount !== showAvailability
  );
}

function mapLayoutToApi(layout: string): string {
  const mapping: Record<string, string> = {
    MONTH_VIEW: "month",
    WEEK_VIEW: "week",
    COLUMN_VIEW: "column",
    month: "month",
    week: "week",
    column: "column",
  };
  return mapping[layout] || layout.toLowerCase().replace("_view", "");
}

function mapLayoutFromApi(layout: string): string {
  const mapping: Record<string, string> = {
    month: "MONTH_VIEW",
    week: "WEEK_VIEW",
    column: "COLUMN_VIEW",
    MONTH_VIEW: "MONTH_VIEW",
    WEEK_VIEW: "WEEK_VIEW",
    COLUMN_VIEW: "COLUMN_VIEW",
  };
  return mapping[layout] || layout.toUpperCase() + "_VIEW";
}

function hasBookerLayoutsChanged(
  selectedLayouts: string[],
  defaultLayout: string,
  original: any
): boolean {
  if (!original) return selectedLayouts.length > 0;

  const originalEnabled = original.enabledLayouts || [];
  const originalDefault = original.defaultLayout;

  const currentNormalized = selectedLayouts.map(mapLayoutToApi).sort();
  const originalNormalized = originalEnabled.map((l: string) => mapLayoutToApi(l)).sort();

  if (!deepEqual(currentNormalized, originalNormalized)) return true;
  return mapLayoutToApi(defaultLayout) !== mapLayoutToApi(originalDefault || "");
}

function hasColorsChanged(lightColor: string, darkColor: string, original: any): boolean {
  if (!original) return lightColor !== "#292929" || darkColor !== "#FAFAFA";
  const originalLight = original.lightThemeHex || original.lightEventTypeColor;
  const originalDark = original.darkThemeHex || original.darkEventTypeColor;

  return lightColor !== originalLight || darkColor !== originalDark;
}

export function buildPartialUpdatePayload(
  currentState: EventTypeFormState,
  originalData: EventType | null
): Record<string, any> {
  const payload: Record<string, any> = {};

  if (!originalData) {
    console.warn("buildPartialUpdatePayload called without original data");
    return {};
  }

  const original = originalData as any;

  if (currentState.eventTitle !== original.title) {
    payload.title = currentState.eventTitle;
  }

  if (currentState.eventSlug !== original.slug) {
    payload.slug = currentState.eventSlug;
  }

  if ((currentState.eventDescription || "") !== (original.description || "")) {
    payload.description = currentState.eventDescription || "";
  }

  const currentDuration = parseInt(currentState.eventDuration);

  if (
    hasMultipleDurationsChanged(
      currentState.allowMultipleDurations,
      currentState.selectedDurations,
      currentState.defaultDuration,
      currentState.eventDuration,
      original
    )
  ) {
    if (currentState.allowMultipleDurations && currentState.selectedDurations.length > 0) {
      const durationOptions = currentState.selectedDurations
        .map(parseDurationString)
        .filter((d) => d > 0);
      const defaultDurationValue = currentState.defaultDuration
        ? parseDurationString(currentState.defaultDuration)
        : currentDuration;

      payload.lengthInMinutes = defaultDurationValue;
      payload.lengthInMinutesOptions = durationOptions;
    } else {
      payload.lengthInMinutes = currentDuration;
    }
  } else if (currentDuration !== original.lengthInMinutes && !currentState.allowMultipleDurations) {
    payload.lengthInMinutes = currentDuration;
  }

  if (currentState.isHidden !== original.hidden) {
    payload.hidden = currentState.isHidden;
  }

  if (currentState.disableGuests !== original.disableGuests) {
    payload.disableGuests = currentState.disableGuests;
  }

  if (haveLocationsChanged(currentState.locations, original.locations)) {
    if (currentState.locations.length > 0) {
      payload.locations = currentState.locations.map((loc) => mapItemToApiLocation(loc));
    } else {
      payload.locations = [];
    }
  }

  if (
    currentState.selectedScheduleId !== undefined &&
    currentState.selectedScheduleId !== original.scheduleId
  ) {
    payload.scheduleId = currentState.selectedScheduleId;
  }

  const currentBeforeBuffer =
    currentState.beforeEventBuffer === "No buffer time"
      ? 0
      : parseBufferTime(currentState.beforeEventBuffer);
  if (currentBeforeBuffer !== (original.beforeEventBuffer || 0)) {
    payload.beforeEventBuffer = currentBeforeBuffer;
  }

  const currentAfterBuffer =
    currentState.afterEventBuffer === "No buffer time"
      ? 0
      : parseBufferTime(currentState.afterEventBuffer);
  if (currentAfterBuffer !== (original.afterEventBuffer || 0)) {
    payload.afterEventBuffer = currentAfterBuffer;
  }

  const currentMinimumNotice = parseMinimumNotice(
    currentState.minimumNoticeValue,
    currentState.minimumNoticeUnit
  );
  if (currentMinimumNotice !== (original.minimumBookingNotice || 0)) {
    payload.minimumBookingNotice = currentMinimumNotice;
  }

  const currentSlotInterval =
    currentState.slotInterval === "Default" ? null : parseSlotInterval(currentState.slotInterval);
  if (currentSlotInterval !== (original.slotInterval || null)) {
    payload.slotInterval = currentSlotInterval;
  }

  if (
    hasBookingLimitsCountChanged(
      currentState.limitBookingFrequency,
      currentState.frequencyLimits,
      original.bookingLimitsCount
    )
  ) {
    if (currentState.limitBookingFrequency && currentState.frequencyLimits.length > 0) {
      const limitsCount: Record<string, number> = {};
      currentState.frequencyLimits.forEach((limit) => {
        const unit = parseFrequencyUnit(limit.unit);
        if (unit) {
          limitsCount[unit] = parseInt(limit.value) || 1;
        }
      });
      payload.bookingLimitsCount = limitsCount;
    } else {
      payload.bookingLimitsCount = { disabled: true };
    }
  }

  // === BOOKING LIMITS DURATION ===
  if (
    hasBookingLimitsDurationChanged(
      currentState.limitTotalDuration,
      currentState.durationLimits,
      original.bookingLimitsDuration
    )
  ) {
    if (currentState.limitTotalDuration && currentState.durationLimits.length > 0) {
      const limitsDuration: Record<string, number> = {};
      currentState.durationLimits.forEach((limit) => {
        const unit = parseFrequencyUnit(limit.unit);
        if (unit) {
          limitsDuration[unit] = parseInt(limit.value) || 60;
        }
      });
      payload.bookingLimitsDuration = limitsDuration;
    } else {
      payload.bookingLimitsDuration = { disabled: true };
    }
  }

  // === ONLY SHOW FIRST AVAILABLE SLOT ===
  if (currentState.onlyShowFirstAvailableSlot !== (original.onlyShowFirstAvailableSlot || false)) {
    payload.onlyShowFirstAvailableSlot = currentState.onlyShowFirstAvailableSlot;
  }

  // === BOOKER ACTIVE BOOKINGS LIMIT ===
  if (
    hasBookerActiveBookingsLimitChanged(
      currentState.maxActiveBookingsPerBooker,
      currentState.maxActiveBookingsValue,
      currentState.offerReschedule,
      original.bookerActiveBookingsLimit
    )
  ) {
    if (currentState.maxActiveBookingsPerBooker) {
      payload.bookerActiveBookingsLimit = {
        maximumActiveBookings: parseInt(currentState.maxActiveBookingsValue) || 1,
        offerReschedule: currentState.offerReschedule,
      };
    } else {
      payload.bookerActiveBookingsLimit = { disabled: true };
    }
  }

  // === BOOKING WINDOW ===
  if (
    hasBookingWindowChanged(
      currentState.limitFutureBookings,
      currentState.futureBookingType,
      currentState.rollingDays,
      currentState.rollingCalendarDays,
      currentState.rangeStartDate,
      currentState.rangeEndDate,
      original.bookingWindow
    )
  ) {
    if (currentState.limitFutureBookings) {
      if (currentState.futureBookingType === "range") {
        payload.bookingWindow = {
          type: "range",
          value: [currentState.rangeStartDate, currentState.rangeEndDate],
        };
      } else {
        payload.bookingWindow = {
          type: currentState.rollingCalendarDays ? "calendarDays" : "businessDays",
          value: parseInt(currentState.rollingDays),
        };
      }
    } else {
      payload.bookingWindow = { disabled: true };
    }
  }

  const originalRequiresConfirmation =
    original.requiresConfirmation ||
    (original.confirmationPolicy && !original.confirmationPolicy.disabled);
  if (currentState.requiresConfirmation !== originalRequiresConfirmation) {
    payload.requiresConfirmation = currentState.requiresConfirmation;
  }

  if (
    currentState.requiresBookerEmailVerification !==
    (original.requiresBookerEmailVerification || false)
  ) {
    payload.requiresBookerEmailVerification = currentState.requiresBookerEmailVerification;
  }

  if (currentState.hideCalendarNotes !== (original.hideCalendarNotes || false)) {
    payload.hideCalendarNotes = currentState.hideCalendarNotes;
  }

  if (currentState.hideCalendarEventDetails !== (original.hideCalendarEventDetails || false)) {
    payload.hideCalendarEventDetails = currentState.hideCalendarEventDetails;
  }

  if (currentState.hideOrganizerEmail !== (original.hideOrganizerEmail || false)) {
    payload.hideOrganizerEmail = currentState.hideOrganizerEmail;
  }

  if (currentState.lockTimezone !== (original.lockTimeZoneToggleOnBookingPage || false)) {
    payload.lockTimeZoneToggleOnBookingPage = currentState.lockTimezone;
  }

  if (
    currentState.allowReschedulingPastEvents !== (original.allowReschedulingPastBookings || false)
  ) {
    payload.allowReschedulingPastBookings = currentState.allowReschedulingPastEvents;
  }

  if (
    currentState.allowBookingThroughRescheduleLink !==
    (original.allowReschedulingCancelledBookings || false)
  ) {
    payload.allowReschedulingCancelledBookings = currentState.allowBookingThroughRescheduleLink;
  }

  if ((currentState.customReplyToEmail || "") !== (original.customReplyToEmail || "")) {
    payload.customReplyToEmail = currentState.customReplyToEmail || null;
  }

  if ((currentState.successRedirectUrl || "") !== (original.successRedirectUrl || "")) {
    payload.successRedirectUrl = currentState.successRedirectUrl || "";
  }

  if (
    currentState.forwardParamsSuccessRedirect !== (original.forwardParamsSuccessRedirect || false)
  ) {
    payload.forwardParamsSuccessRedirect = currentState.forwardParamsSuccessRedirect;
  }

  if (
    hasBookerLayoutsChanged(
      currentState.selectedLayouts,
      currentState.defaultLayout,
      original.bookerLayouts
    )
  ) {
    payload.bookerLayouts = {
      enabledLayouts: currentState.selectedLayouts.map(mapLayoutToApi),
      defaultLayout: mapLayoutToApi(currentState.defaultLayout),
    };
  }

  const originalColor = original.color || original.eventTypeColor;
  if (
    hasColorsChanged(
      currentState.eventTypeColorLight,
      currentState.eventTypeColorDark,
      originalColor
    )
  ) {
    payload.color = {
      lightThemeHex: currentState.eventTypeColorLight,
      darkThemeHex: currentState.eventTypeColorDark,
    };
  }

  const metadataChanges: Record<string, any> = {};
  const originalMetadata = original.metadata || {};

  if (
    currentState.disableCancelling !==
    (originalMetadata.disableCancelling || original.disableCancelling || false)
  ) {
    metadataChanges.disableCancelling = currentState.disableCancelling;
  }

  if (
    currentState.disableRescheduling !==
    (originalMetadata.disableRescheduling || original.disableRescheduling || false)
  ) {
    metadataChanges.disableRescheduling = currentState.disableRescheduling;
  }

  if (
    currentState.sendCalVideoTranscription !==
    (originalMetadata.sendCalVideoTranscription || original.sendCalVideoTranscription || false)
  ) {
    metadataChanges.sendCalVideoTranscription = currentState.sendCalVideoTranscription;
  }

  if (
    currentState.autoTranslate !==
    (originalMetadata.autoTranslate || original.autoTranslate || false)
  ) {
    metadataChanges.autoTranslate = currentState.autoTranslate;
  }

  if ((currentState.calendarEventName || "") !== (originalMetadata.calendarEventName || "")) {
    if (currentState.calendarEventName) {
      metadataChanges.calendarEventName = currentState.calendarEventName;
    }
  }

  if ((currentState.addToCalendarEmail || "") !== (originalMetadata.addToCalendarEmail || "")) {
    if (currentState.addToCalendarEmail) {
      metadataChanges.addToCalendarEmail = currentState.addToCalendarEmail;
    }
  }

  if (Object.keys(metadataChanges).length > 0) {
    payload.metadata = metadataChanges;
  }

  if (
    hasRecurrenceChanged(
      currentState.recurringEnabled,
      currentState.recurringInterval,
      currentState.recurringFrequency,
      currentState.recurringOccurrences,
      original.recurrence
    )
  ) {
    if (currentState.recurringEnabled) {
      payload.recurrence = {
        interval: parseInt(currentState.recurringInterval) || 1,
        occurrences: parseInt(currentState.recurringOccurrences) || 12,
        frequency: currentState.recurringFrequency,
      };
    } else {
      payload.recurrence = { disabled: true };
    }
  }

  if (
    hasSeatsChanged(
      currentState.seatsEnabled,
      currentState.seatsPerTimeSlot,
      currentState.showAttendeeInfo,
      currentState.showAvailabilityCount,
      original.seats
    )
  ) {
    if (currentState.seatsEnabled) {
      payload.seats = {
        seatsPerTimeSlot: parseInt(currentState.seatsPerTimeSlot) || 2,
        showAttendeeInfo: currentState.showAttendeeInfo,
        showAvailabilityCount: currentState.showAvailabilityCount,
      };
    } else {
      payload.seats = { disabled: true };
    }
  }

  return payload;
}

export function hasChanges(
  currentState: EventTypeFormState,
  originalData: EventType | null
): boolean {
  const payload = buildPartialUpdatePayload(currentState, originalData);
  return Object.keys(payload).length > 0;
}
