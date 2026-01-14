import type { BookingLimitsCount, BookingLimitsDuration, EventType } from "@/services/calcom";
import type { LocationItem } from "@/types/locations";
import {
  parseBufferTime,
  parseFrequencyUnit,
  parseMinimumNotice,
  parseSlotInterval,
} from "@/utils/eventTypeParsers";
import { mapItemToApiLocation } from "@/utils/locationHelpers";

interface LocationInput {
  type: string;
  integration?: string;
  address?: string;
  link?: string;
  phone?: string;
  public?: boolean;
}

interface NormalizedLocation {
  type: string;
  integration?: string;
  address?: string;
  link?: string;
  phone?: string;
  public?: boolean;
}

interface BookingWindow {
  disabled?: boolean;
  type?: string;
  value?: number | string[];
}

interface BookerActiveBookingsLimit {
  disabled?: boolean;
  maximumActiveBookings?: number;
  count?: number;
  offerReschedule?: boolean;
}

interface RecurrenceConfig {
  disabled?: boolean;
  interval?: number;
  frequency?: string;
  occurrences?: number;
}

interface SeatsConfig {
  disabled?: boolean;
  seatsPerTimeSlot?: number;
  showAttendeeInfo?: boolean;
  showAvailabilityCount?: boolean;
}

interface BookerLayoutsConfig {
  enabledLayouts?: string[];
  defaultLayout?: string;
}

interface ColorsConfig {
  lightThemeHex?: string;
  darkThemeHex?: string;
  lightEventTypeColor?: string;
  darkEventTypeColor?: string;
}

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

  interfaceLanguage: string;
  showOptimizedSlots: boolean;

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
  original: EventType | null
): boolean {
  const originalOptions = original?.lengthInMinutesOptions;
  const originalHasMultiple =
    originalOptions && Array.isArray(originalOptions) && originalOptions.length > 0;

  if (!enabled && !originalHasMultiple) return false;
  if (!enabled && originalHasMultiple) return true;
  if (enabled && !originalHasMultiple) return true;

  const currentDurations = selectedDurations.map(parseDurationString).sort((a, b) => a - b);
  const originalDurations = [...(originalOptions ?? [])].sort((a: number, b: number) => a - b);

  if (!areEqual(currentDurations, originalDurations)) return true;

  // Also check if the default (main) duration changed
  const currentDefault = parseDurationString(defaultDuration || mainDuration);
  const originalDefault = original?.lengthInMinutes;

  return currentDefault !== originalDefault;
}

function areEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => areEqual(item, b[index]));
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA).sort();
  const keysB = Object.keys(objB).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key, index) => key === keysB[index] && areEqual(objA[key], objB[key]));
}

function normalizeLocation(loc: LocationInput | null): NormalizedLocation | null {
  if (!loc) return null;

  const normalized: NormalizedLocation = { type: loc.type };

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
  originalLocations: LocationInput[] | undefined
): boolean {
  if ((!originalLocations || originalLocations.length === 0) && currentLocations.length === 0) {
    return false;
  }
  if (!originalLocations && currentLocations.length > 0) return true;
  if (originalLocations && currentLocations.length !== originalLocations.length) return true;

  const currentMapped = currentLocations.map((loc) => normalizeLocation(mapItemToApiLocation(loc)));
  const originalMapped = originalLocations?.map((loc) => normalizeLocation(loc)) ?? [];

  const sortByType = (a: NormalizedLocation | null, b: NormalizedLocation | null) =>
    (a?.type || "").localeCompare(b?.type || "");
  currentMapped.sort(sortByType);
  originalMapped.sort(sortByType);

  return !areEqual(currentMapped, originalMapped);
}

function hasBookingLimitsCountChanged(
  enabled: boolean,
  limits: FrequencyLimit[],
  original: BookingLimitsCount | { disabled: true } | null | undefined
): boolean {
  const originalIsDisabled =
    !original ||
    ("disabled" in original && original.disabled === true) ||
    Object.keys(original).length === 0;

  if (!enabled && originalIsDisabled) return false;
  if (!enabled && !originalIsDisabled) return true;
  if (enabled && originalIsDisabled) return true;

  const currentLimits: Record<string, number> = {};
  limits.forEach((limit) => {
    const unit = parseFrequencyUnit(limit.unit);
    if (unit) {
      currentLimits[unit] = parseInt(limit.value, 10) || 1;
    }
  });

  const originalLimits: Record<string, number> = {};
  if (original && !("disabled" in original)) {
    const orig = original as BookingLimitsCount;
    if (orig.day !== undefined) originalLimits.day = orig.day;
    if (orig.week !== undefined) originalLimits.week = orig.week;
    if (orig.month !== undefined) originalLimits.month = orig.month;
    if (orig.year !== undefined) originalLimits.year = orig.year;
  }

  return !areEqual(currentLimits, originalLimits);
}

function hasBookingLimitsDurationChanged(
  enabled: boolean,
  limits: FrequencyLimit[],
  original: BookingLimitsDuration | { disabled: true } | null | undefined
): boolean {
  const originalIsDisabled =
    !original ||
    ("disabled" in original && original.disabled === true) ||
    Object.keys(original).length === 0;

  if (!enabled && originalIsDisabled) return false;
  if (!enabled && !originalIsDisabled) return true;
  if (enabled && originalIsDisabled) return true;

  const currentLimits: Record<string, number> = {};
  limits.forEach((limit) => {
    const unit = parseFrequencyUnit(limit.unit);
    if (unit) {
      currentLimits[unit] = parseInt(limit.value, 10) || 60;
    }
  });

  const originalLimits: Record<string, number> = {};
  if (original && !("disabled" in original)) {
    const orig = original as BookingLimitsDuration;
    if (orig.day !== undefined) originalLimits.day = orig.day;
    if (orig.week !== undefined) originalLimits.week = orig.week;
    if (orig.month !== undefined) originalLimits.month = orig.month;
    if (orig.year !== undefined) originalLimits.year = orig.year;
  }

  return !areEqual(currentLimits, originalLimits);
}

function hasBookingWindowChanged(
  enabled: boolean,
  type: "rolling" | "range",
  rollingDays: string,
  calendarDays: boolean,
  rangeStart: string,
  rangeEnd: string,
  original: BookingWindow | null | undefined
): boolean {
  const originalDisabled = !original || original.disabled;

  if (!enabled && originalDisabled) return false;
  if (!enabled && !originalDisabled) return true;
  if (enabled && originalDisabled) return true;

  if (type === "range") {
    if (original?.type !== "range") return true;
    const originalValue = original?.value;
    if (!Array.isArray(originalValue)) return true;
    return originalValue[0] !== rangeStart || originalValue[1] !== rangeEnd;
  } else {
    const expectedType = calendarDays ? "calendarDays" : "businessDays";
    if (original?.type !== expectedType) return true;
    return original?.value !== parseInt(rollingDays, 10);
  }
}

function hasBookerActiveBookingsLimitChanged(
  enabled: boolean,
  value: string,
  offerReschedule: boolean,
  original: BookerActiveBookingsLimit | null | undefined
): boolean {
  const originalDisabled = !original || original.disabled;

  if (!enabled && originalDisabled) return false;
  if (!enabled && !originalDisabled) return true;
  if (enabled && originalDisabled) return true;

  const originalMax = original?.maximumActiveBookings ?? original?.count;
  return originalMax !== parseInt(value, 10) || original?.offerReschedule !== offerReschedule;
}

function hasRecurrenceChanged(
  enabled: boolean,
  interval: string,
  frequency: string,
  occurrences: string,
  original: RecurrenceConfig | null | undefined
): boolean {
  const originalDisabled = !original || original.disabled === true;

  if (!enabled && originalDisabled) return false;
  if (!enabled && !originalDisabled) return true;
  if (enabled && originalDisabled) return true;

  return (
    original?.interval !== parseInt(interval, 10) ||
    original?.frequency !== frequency ||
    original?.occurrences !== parseInt(occurrences, 10)
  );
}

function hasSeatsChanged(
  enabled: boolean,
  perTimeSlot: string,
  showAttendee: boolean,
  showAvailability: boolean,
  original: SeatsConfig | null | undefined
): boolean {
  const originalDisabled = !original || original.disabled === true;
  const originalEnabled =
    original &&
    (original.disabled === false || (!("disabled" in original) && original.seatsPerTimeSlot));

  if (!enabled && originalDisabled) return false;
  if (!enabled && originalEnabled) return true;
  if (enabled && originalDisabled) return true;

  return (
    original?.seatsPerTimeSlot !== parseInt(perTimeSlot, 10) ||
    original?.showAttendeeInfo !== showAttendee ||
    original?.showAvailabilityCount !== showAvailability
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

function _mapLayoutFromApi(layout: string): string {
  const mapping: Record<string, string> = {
    month: "MONTH_VIEW",
    week: "WEEK_VIEW",
    column: "COLUMN_VIEW",
    MONTH_VIEW: "MONTH_VIEW",
    WEEK_VIEW: "WEEK_VIEW",
    COLUMN_VIEW: "COLUMN_VIEW",
  };
  return mapping[layout] || `${layout.toUpperCase()}_VIEW`;
}

function hasBookerLayoutsChanged(
  selectedLayouts: string[],
  defaultLayout: string,
  original: BookerLayoutsConfig | null | undefined
): boolean {
  if (!original) return selectedLayouts.length > 0;

  const originalEnabled = original.enabledLayouts || [];
  const originalDefault = original.defaultLayout;

  const currentNormalized = selectedLayouts.map(mapLayoutToApi).sort();
  const originalNormalized = originalEnabled.map((l: string) => mapLayoutToApi(l)).sort();

  if (!areEqual(currentNormalized, originalNormalized)) return true;
  return mapLayoutToApi(defaultLayout) !== mapLayoutToApi(originalDefault || "");
}

function hasColorsChanged(
  lightColor: string,
  darkColor: string,
  original: ColorsConfig | null | undefined
): boolean {
  if (!original) return lightColor !== "#292929" || darkColor !== "#FAFAFA";
  const originalLight = original.lightThemeHex || original.lightEventTypeColor;
  const originalDark = original.darkThemeHex || original.darkEventTypeColor;

  return lightColor !== originalLight || darkColor !== originalDark;
}

export function buildPartialUpdatePayload(
  currentState: EventTypeFormState,
  originalData: EventType | null
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (!originalData) {
    console.warn("buildPartialUpdatePayload called without original data");
    return {};
  }

  const original = originalData;

  if (currentState.eventTitle !== original.title) {
    payload.title = currentState.eventTitle;
  }

  if (currentState.eventSlug !== original.slug) {
    payload.slug = currentState.eventSlug;
  }

  if ((currentState.eventDescription || "") !== (original.description || "")) {
    payload.description = currentState.eventDescription || "";
  }

  const currentDuration = parseInt(currentState.eventDuration, 10);

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
          limitsCount[unit] = parseInt(limit.value, 10) || 1;
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
          limitsDuration[unit] = parseInt(limit.value, 10) || 60;
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
        maximumActiveBookings: parseInt(currentState.maxActiveBookingsValue, 10) || 1,
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
          value: parseInt(currentState.rollingDays, 10),
        };
      }
    } else {
      payload.bookingWindow = { disabled: true };
    }
  }

  const originalRequiresConfirmation =
    original.requiresConfirmation === true ||
    (original.confirmationPolicy &&
      !(
        "disabled" in original.confirmationPolicy && original.confirmationPolicy.disabled === true
      ));
  if (currentState.requiresConfirmation !== !!originalRequiresConfirmation) {
    // API V2 expects confirmationPolicy object, not requiresConfirmation boolean
    if (currentState.requiresConfirmation) {
      payload.confirmationPolicy = { type: "always" };
    } else {
      payload.confirmationPolicy = { disabled: true };
    }
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

  const metadataChanges: Record<string, unknown> = {};
  const originalMetadata = original.metadata || {};

  // Disable Cancelling
  const originalDisableCancelling =
    typeof original.disableCancelling === "object"
      ? original.disableCancelling.disabled
      : original.disableCancelling || false;

  if (currentState.disableCancelling !== originalDisableCancelling) {
    payload.disableCancelling = { disabled: currentState.disableCancelling };
  }

  // Disable Rescheduling
  const originalDisableRescheduling =
    typeof original.disableRescheduling === "object"
      ? original.disableRescheduling.disabled
      : original.disableRescheduling || false;

  if (currentState.disableRescheduling !== originalDisableRescheduling) {
    payload.disableRescheduling = { disabled: currentState.disableRescheduling };
  }

  // Cal Video Settings
  const originalSendTranscription = original.calVideoSettings?.sendTranscriptionEmails ?? false;

  if (currentState.sendCalVideoTranscription !== originalSendTranscription) {
    payload.calVideoSettings = {
      sendTranscriptionEmails: currentState.sendCalVideoTranscription,
    };
  }

  // Interface Language (API V2)
  if (currentState.interfaceLanguage !== (original.interfaceLanguage || "")) {
    payload.interfaceLanguage = currentState.interfaceLanguage || null;
  }

  // Show Optimized Slots (API V2)
  if (currentState.showOptimizedSlots !== (original.showOptimizedSlots || false)) {
    payload.showOptimizedSlots = currentState.showOptimizedSlots;
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
        interval: parseInt(currentState.recurringInterval, 10) || 1,
        occurrences: parseInt(currentState.recurringOccurrences, 10) || 12,
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
        seatsPerTimeSlot: parseInt(currentState.seatsPerTimeSlot, 10) || 2,
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
