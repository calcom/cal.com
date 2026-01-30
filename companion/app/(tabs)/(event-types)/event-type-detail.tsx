import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import { AdvancedTab } from "@/components/event-type-detail/tabs/AdvancedTab";
import { AvailabilityTab } from "@/components/event-type-detail/tabs/AvailabilityTab";
import { BasicsTab } from "@/components/event-type-detail/tabs/BasicsTab";
import { LimitsTab } from "@/components/event-type-detail/tabs/LimitsTab";
import { RecurringTab } from "@/components/event-type-detail/tabs/RecurringTab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateTitle } from "@/components/event-type-detail/utils";
import { buildPartialUpdatePayload } from "@/components/event-type-detail/utils/buildPartialUpdatePayload";
import {
  CalComAPIService,
  type ConferencingOption,
  type EventType,
  type Schedule,
} from "@/services/calcom";
import { useCreateEventType, useDeleteEventType, useUpdateEventType } from "@/hooks";
import type { LocationItem, LocationOptionGroup } from "@/types/locations";
import {
  showErrorAlert,
  showInfoAlert,
  showNotAvailableAlert,
  showSuccessAlert,
} from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import {
  buildLocationOptions,
  mapApiLocationToItem,
  mapItemToApiLocation,
  validateLocationItem,
} from "@/utils/locationHelpers";
import { safeLogError } from "@/utils/safeLogger";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

// Type definitions for extended EventType fields not in the base type
interface EventTypeExtended {
  lengthInMinutesOptions?: number[];
  // API V2 format - these can be objects or booleans from older data
  disableCancelling?: boolean | { disabled: boolean };
  disableRescheduling?: boolean | { disabled: boolean; minutesBefore?: number };
  sendCalVideoTranscription?: boolean;

  lockedTimeZone?: string;
  hideCalendarEventDetails?: boolean;
  hideOrganizerEmail?: boolean;
  color?: {
    lightThemeHex?: string;
    darkThemeHex?: string;
  };
  // API V2 new fields
  calVideoSettings?: {
    sendTranscriptionEmails?: boolean;
  };
  interfaceLanguage?: string;
  showOptimizedSlots?: boolean;
}

interface BookerActiveBookingsLimitExtended {
  disabled?: boolean;
  maximumActiveBookings?: number;
  count?: number;
  offerReschedule?: boolean;
}

interface ConfirmationPolicyExtended {
  disabled?: boolean;
}

interface RecurrenceExtended {
  disabled?: boolean;
  interval?: number;
  frequency?: string;
  occurrences?: number;
}

interface SeatsExtended {
  disabled?: boolean;
  seatsPerTimeSlot?: number;
  showAttendeeInfo?: boolean;
  showAvailabilityCount?: boolean;
}

interface ApiLocation {
  type: string;
  integration?: string;
  address?: string;
  link?: string;
  phone?: string;
  public?: boolean;
}

interface CreateEventTypePayload {
  title: string;
  slug: string;
  lengthInMinutes: number;
  description?: string;
  locations?: ReturnType<typeof mapItemToApiLocation>[];
  scheduleId?: number;
  hidden?: boolean;
}

type TabIconName = "link" | "calendar" | "time" | "settings" | "refresh" | "ellipsis-horizontal";

interface Tab {
  id: string;
  label: string;
  icon: TabIconName;
}

const tabs: Tab[] = [
  { id: "basics", label: "Basics", icon: "link" },
  { id: "availability", label: "Availability", icon: "calendar" },
  { id: "limits", label: "Limits", icon: "time" },
  { id: "advanced", label: "Advanced", icon: "settings" },
  { id: "recurring", label: "Recurring", icon: "refresh" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal" },
];

export default function EventTypeDetail() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { id, title, description, duration, slug } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    slug?: string;
  }>();

  // Mutation hooks for optimistic updates
  const { mutateAsync: updateEventType, isPending: isUpdating } = useUpdateEventType();
  const { mutateAsync: createEventType, isPending: isCreating } = useCreateEventType();
  const { mutateAsync: deleteEventType } = useDeleteEventType();

  const [activeTab, setActiveTab] = useState("basics");

  // Form state
  const [eventTitle, setEventTitle] = useState(title || "");
  const [eventDescription, setEventDescription] = useState(description || "");
  const [eventSlug, setEventSlug] = useState(slug || "");
  const [eventDuration, setEventDuration] = useState(duration || "30");
  const [username, setUsername] = useState("username");
  const [allowMultipleDurations, setAllowMultipleDurations] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [_locationAddress, setLocationAddress] = useState("");
  const [_locationLink, setLocationLink] = useState("");
  const [_locationPhone, setLocationPhone] = useState("");
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [defaultDuration, setDefaultDuration] = useState("");
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showDefaultDurationDropdown, setShowDefaultDurationDropdown] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedScheduleDetails, setSelectedScheduleDetails] = useState<Schedule | null>(null);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleDetailsLoading, setScheduleDetailsLoading] = useState(false);
  const [initialScheduleId, setInitialScheduleId] = useState<number | null>(null);
  const hasAutoSelectedScheduleRef = useRef(false);

  // Reset auto-selection ref when event type id changes (e.g., navigation reuse)
  useEffect(() => {
    hasAutoSelectedScheduleRef.current = false;
  }, []);

  const [isHidden, setIsHidden] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [conferencingOptions, setConferencingOptions] = useState<ConferencingOption[]>([]);
  const [conferencingLoading, setConferencingLoading] = useState(false);
  const [eventTypeData, setEventTypeData] = useState<EventType | null>(null);
  const [bookingUrl, setBookingUrl] = useState<string>("");
  // Use mutation hooks' isPending states instead of local saving state
  const isSaving = isUpdating || isCreating;
  const [beforeEventBuffer, setBeforeEventBuffer] = useState("No buffer time");
  const [afterEventBuffer, setAfterEventBuffer] = useState("No buffer time");
  const [showBeforeBufferDropdown, setShowBeforeBufferDropdown] = useState(false);
  const [showAfterBufferDropdown, setShowAfterBufferDropdown] = useState(false);
  const [minimumNoticeValue, setMinimumNoticeValue] = useState("1");
  const [minimumNoticeUnit, setMinimumNoticeUnit] = useState("Hours");
  const [showMinimumNoticeUnitDropdown, setShowMinimumNoticeUnitDropdown] = useState(false);
  const [limitBookingFrequency, setLimitBookingFrequency] = useState(false);
  const [frequencyLimits, setFrequencyLimits] = useState([{ id: 1, value: "1", unit: "Per day" }]);
  const [showFrequencyUnitDropdown, setShowFrequencyUnitDropdown] = useState<number | null>(null);
  const [frequencyAnimationValue] = useState(new Animated.Value(0));
  const [limitTotalDuration, setLimitTotalDuration] = useState(false);
  const [durationLimits, setDurationLimits] = useState([{ id: 1, value: "60", unit: "Per day" }]);
  const [showDurationUnitDropdown, setShowDurationUnitDropdown] = useState<number | null>(null);
  const [durationAnimationValue] = useState(new Animated.Value(0));
  const [slotInterval, setSlotInterval] = useState("Default");
  const [showSlotIntervalDropdown, setShowSlotIntervalDropdown] = useState(false);
  const [onlyShowFirstAvailableSlot, setOnlyShowFirstAvailableSlot] = useState(false);
  const [maxActiveBookingsPerBooker, setMaxActiveBookingsPerBooker] = useState(false);
  const [maxActiveBookingsValue, setMaxActiveBookingsValue] = useState("1");
  const [offerReschedule, setOfferReschedule] = useState(false);
  const [limitFutureBookings, setLimitFutureBookings] = useState(false);
  const [futureBookingType, setFutureBookingType] = useState<"rolling" | "range">("rolling");
  const [rollingDays, setRollingDays] = useState("30");
  const [rollingCalendarDays, setRollingCalendarDays] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState("");
  const [rangeEndDate, setRangeEndDate] = useState("");

  // Advanced tab state
  const [calendarEventName, setCalendarEventName] = useState("");
  const [addToCalendarEmail, setAddToCalendarEmail] = useState("");
  const [selectedLayouts, setSelectedLayouts] = useState<string[]>(["MONTH_VIEW"]);
  const [defaultLayout, setDefaultLayout] = useState("MONTH_VIEW");
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [disableCancelling, setDisableCancelling] = useState(false);
  const [disableRescheduling, setDisableRescheduling] = useState(false);
  const [sendCalVideoTranscription, setSendCalVideoTranscription] = useState(true);

  const [requiresBookerEmailVerification, setRequiresBookerEmailVerification] = useState(false);
  const [hideCalendarNotes, setHideCalendarNotes] = useState(false);
  const [hideCalendarEventDetails, setHideCalendarEventDetails] = useState(false);
  const [redirectEnabled, setRedirectEnabled] = useState(false);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState("");
  const [forwardParamsSuccessRedirect, setForwardParamsSuccessRedirect] = useState(false);
  const [hideOrganizerEmail, setHideOrganizerEmail] = useState(false);
  const [lockTimezone, setLockTimezone] = useState(false);
  const [lockedTimezone, setLockedTimezone] = useState("Europe/London");
  const [allowReschedulingPastEvents, setAllowReschedulingPastEvents] = useState(false);
  const [allowBookingThroughRescheduleLink, setAllowBookingThroughRescheduleLink] = useState(false);
  const [disableGuests, setDisableGuests] = useState(false);
  const [customReplyToEmail, setCustomReplyToEmail] = useState("");
  const [eventTypeColorLight, setEventTypeColorLight] = useState("#292929");
  const [eventTypeColorDark, setEventTypeColorDark] = useState("#FAFAFA");
  const [interfaceLanguageEnabled, setInterfaceLanguageEnabled] = useState(false);
  const [interfaceLanguage, setInterfaceLanguage] = useState("");
  const [showOptimizedSlots, setShowOptimizedSlots] = useState(false);

  const [seatsEnabled, setSeatsEnabled] = useState(false);
  const [seatsPerTimeSlot, setSeatsPerTimeSlot] = useState("2");
  const [showAttendeeInfo, setShowAttendeeInfo] = useState(false);
  const [showAvailabilityCount, setShowAvailabilityCount] = useState(true);

  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("1");
  const [recurringFrequency, setRecurringFrequency] = useState<"weekly" | "monthly" | "yearly">(
    "weekly"
  );
  const [recurringOccurrences, setRecurringOccurrences] = useState("12");
  const [showRecurringFrequencyDropdown, setShowRecurringFrequencyDropdown] = useState(false);

  const bufferTimeOptions = [
    "No buffer time",
    "5 Minutes",
    "10 Minutes",
    "15 Minutes",
    "20 Minutes",
    "30 Minutes",
    "45 Minutes",
    "60 Minutes",
    "90 Minutes",
    "120 Minutes",
  ];
  const timeUnitOptions = ["Minutes", "Hours", "Days"];
  const frequencyUnitOptions = ["Per day", "Per Month", "Per year"];
  const durationUnitOptions = ["Per day", "Per week", "Per month"];
  const slotIntervalOptions = [
    "Default",
    "5 Minutes",
    "10 Minutes",
    "15 Minutes",
    "20 Minutes",
    "30 Minutes",
    "45 Minutes",
    "60 Minutes",
    "75 Minutes",
    "90 Minutes",
    "105 Minutes",
    "120 Minutes",
  ];
  const availableDurations = [
    "5 mins",
    "10 mins",
    "15 mins",
    "20 mins",
    "25 mins",
    "30 mins",
    "45 mins",
    "50 mins",
    "60 mins",
    "75 mins",
    "80 mins",
    "90 mins",
    "120 mins",
    "150 mins",
    "180 mins",
    "240 mins",
    "300 mins",
    "360 mins",
    "420 mins",
    "480 mins",
  ];

  const getLocationOptionsForDropdown = (): LocationOptionGroup[] => {
    // Filter out conferencing options with null appId
    const validOptions = conferencingOptions.filter(
      (opt): opt is ConferencingOption & { appId: string } => opt.appId !== null
    );
    return buildLocationOptions(validOptions);
  };

  const handleAddLocation = (location: LocationItem) => {
    setLocations((prev) => [...prev, location]);
  };

  const handleRemoveLocation = (locationId: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
  };

  const handleUpdateLocation = (locationId: string, updates: Partial<LocationItem>) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === locationId ? { ...loc, ...updates } : loc))
    );
  };

  const toggleDurationSelection = (duration: string) => {
    const newSelected = selectedDurations.includes(duration)
      ? selectedDurations.filter((d) => d !== duration)
      : [...selectedDurations, duration];

    setSelectedDurations(newSelected);

    // Reset default duration if it's no longer in selected durations
    if (!newSelected.includes(defaultDuration)) {
      setDefaultDuration("");
    }
  };

  const toggleBookingFrequency = (value: boolean) => {
    setLimitBookingFrequency(value);

    Animated.timing(frequencyAnimationValue, {
      toValue: value ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const addFrequencyLimit = () => {
    const newId = Math.max(...frequencyLimits.map((limit) => limit.id)) + 1;
    setFrequencyLimits([...frequencyLimits, { id: newId, value: "1", unit: "Per day" }]);
  };

  const removeFrequencyLimit = (id: number) => {
    setFrequencyLimits(frequencyLimits.filter((limit) => limit.id !== id));
  };

  const updateFrequencyLimit = (id: number, field: "value" | "unit", newValue: string) => {
    setFrequencyLimits(
      frequencyLimits.map((limit) => (limit.id === id ? { ...limit, [field]: newValue } : limit))
    );
  };

  const toggleTotalDuration = (value: boolean) => {
    setLimitTotalDuration(value);

    Animated.timing(durationAnimationValue, {
      toValue: value ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const addDurationLimit = () => {
    const newId = Math.max(...durationLimits.map((limit) => limit.id)) + 1;
    setDurationLimits([...durationLimits, { id: newId, value: "60", unit: "Per day" }]);
  };

  const removeDurationLimit = (id: number) => {
    setDurationLimits(durationLimits.filter((limit) => limit.id !== id));
  };

  const updateDurationLimit = (id: number, field: "value" | "unit", newValue: string) => {
    setDurationLimits(
      durationLimits.map((limit) => (limit.id === id ? { ...limit, [field]: newValue } : limit))
    );
  };

  const fetchScheduleDetails = useCallback(async (scheduleId: number) => {
    setScheduleDetailsLoading(true);
    let scheduleDetails: Awaited<ReturnType<typeof CalComAPIService.getScheduleById>> | null = null;
    try {
      scheduleDetails = await CalComAPIService.getScheduleById(scheduleId);
    } catch (error) {
      safeLogError("Failed to fetch schedule details:", error);
      setSelectedScheduleDetails(null);
      setScheduleDetailsLoading(false);
      return;
    }
    setSelectedScheduleDetails(scheduleDetails);
    const timeZone = scheduleDetails?.timeZone;
    if (timeZone) {
      setSelectedTimezone(timeZone);
    }
    setScheduleDetailsLoading(false);
  }, []);

  const fetchSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const schedulesData = await CalComAPIService.getSchedules();
      setSchedules(schedulesData);

      // Only auto-select a schedule if we haven't already done so
      // This prevents unnecessary re-fetches when the callback is recreated
      if (!hasAutoSelectedScheduleRef.current) {
        // Use the event type's schedule if we have it, otherwise use default
        let scheduleToSelect: Schedule | undefined;

        if (initialScheduleId) {
          scheduleToSelect = schedulesData.find((schedule) => schedule.id === initialScheduleId);
        }

        if (!scheduleToSelect) {
          scheduleToSelect = schedulesData.find((schedule) => schedule.isDefault);
        }

        if (scheduleToSelect) {
          hasAutoSelectedScheduleRef.current = true;
          setSelectedSchedule(scheduleToSelect);
          await fetchScheduleDetails(scheduleToSelect.id);
        }
      }
      setSchedulesLoading(false);
    } catch (error) {
      safeLogError("Failed to fetch schedules:", error);
      setSchedulesLoading(false);
    }
  }, [fetchScheduleDetails, initialScheduleId]);

  const fetchConferencingOptions = useCallback(async () => {
    setConferencingLoading(true);
    try {
      const options = await CalComAPIService.getConferencingOptions();
      setConferencingOptions(options);
      setConferencingLoading(false);
    } catch (error) {
      safeLogError("Failed to fetch conferencing options:", error);
      setConferencingLoading(false);
    }
  }, []);

  const applyEventTypeData = useCallback((eventType: EventType) => {
    setEventTypeData(eventType);

    // Load basic fields
    if (eventType.title) setEventTitle(eventType.title);
    if (eventType.slug) setEventSlug(eventType.slug);
    if (eventType.description) setEventDescription(eventType.description);
    if (eventType.lengthInMinutes) setEventDuration(eventType.lengthInMinutes.toString());
    if (eventType.hidden !== undefined) setIsHidden(eventType.hidden);
    if (eventType.bookingUrl) setBookingUrl(eventType.bookingUrl);

    // Load schedule ID - this will be used by fetchSchedules to select the correct schedule
    if (eventType.scheduleId) {
      setInitialScheduleId(eventType.scheduleId);
    }

    const eventTypeExt = eventType as EventType & EventTypeExtended;
    const lengthOptions = eventTypeExt.lengthInMinutesOptions;
    const hasLengthOptions =
      lengthOptions && Array.isArray(lengthOptions) && lengthOptions.length > 0;
    if (hasLengthOptions) {
      setAllowMultipleDurations(true);
      const durationStrings = lengthOptions.map((mins: number) => `${mins} mins`);
      setSelectedDurations(durationStrings);
      if (eventType.lengthInMinutes) {
        setDefaultDuration(`${eventType.lengthInMinutes} mins`);
      }
    }

    // Load buffer times
    if (eventType.beforeEventBuffer) {
      setBeforeEventBuffer(`${eventType.beforeEventBuffer} Minutes`);
    }
    if (eventType.afterEventBuffer) {
      setAfterEventBuffer(`${eventType.afterEventBuffer} Minutes`);
    }

    // Load minimum booking notice
    if (eventType.minimumBookingNotice) {
      const minutes = eventType.minimumBookingNotice;
      if (minutes >= 1440) {
        // Days
        setMinimumNoticeValue((minutes / 1440).toString());
        setMinimumNoticeUnit("Days");
      } else if (minutes >= 60) {
        // Hours
        setMinimumNoticeValue((minutes / 60).toString());
        setMinimumNoticeUnit("Hours");
      } else {
        // Minutes
        setMinimumNoticeValue(minutes.toString());
        setMinimumNoticeUnit("Minutes");
      }
    }

    // Load slot interval
    if (eventType.slotInterval) {
      setSlotInterval(`${eventType.slotInterval} Minutes`);
    }

    // Load booking frequency limits
    const bookingLimitsCount = eventType.bookingLimitsCount;
    const hasBookingLimitsCount = bookingLimitsCount && !("disabled" in bookingLimitsCount);
    if (hasBookingLimitsCount) {
      setLimitBookingFrequency(true);
      const limits: { id: number; value: string; unit: string }[] = [];
      let idCounter = 1;
      if (bookingLimitsCount.day) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsCount.day.toString(),
          unit: "Per day",
        });
      }
      if (bookingLimitsCount.week) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsCount.week.toString(),
          unit: "Per week",
        });
      }
      if (bookingLimitsCount.month) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsCount.month.toString(),
          unit: "Per month",
        });
      }
      if (bookingLimitsCount.year) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsCount.year.toString(),
          unit: "Per year",
        });
      }
      if (limits.length > 0) {
        setFrequencyLimits(limits);
      }
    }

    // Load duration limits
    const bookingLimitsDuration = eventType.bookingLimitsDuration;
    const hasBookingLimitsDuration =
      bookingLimitsDuration && !("disabled" in bookingLimitsDuration);
    if (hasBookingLimitsDuration) {
      setLimitTotalDuration(true);
      const limits: { id: number; value: string; unit: string }[] = [];
      let idCounter = 1;
      if (bookingLimitsDuration.day) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsDuration.day.toString(),
          unit: "Per day",
        });
      }
      if (bookingLimitsDuration.week) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsDuration.week.toString(),
          unit: "Per week",
        });
      }
      if (bookingLimitsDuration.month) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsDuration.month.toString(),
          unit: "Per month",
        });
      }
      if (bookingLimitsDuration.year) {
        limits.push({
          id: idCounter++,
          value: bookingLimitsDuration.year.toString(),
          unit: "Per year",
        });
      }
      if (limits.length > 0) {
        setDurationLimits(limits);
      }
    }

    // Load only show first slot
    if (eventType.onlyShowFirstAvailableSlot !== undefined) {
      setOnlyShowFirstAvailableSlot(eventType.onlyShowFirstAvailableSlot);
    }

    if (eventType.bookerActiveBookingsLimit) {
      const bookingLimit = eventType.bookerActiveBookingsLimit as BookerActiveBookingsLimitExtended;
      const isBookingLimitEnabled = !("disabled" in bookingLimit);
      if (isBookingLimitEnabled) {
        const maxBookings = bookingLimit.maximumActiveBookings ?? bookingLimit.count;
        if (maxBookings !== undefined) {
          setMaxActiveBookingsPerBooker(true);
          setMaxActiveBookingsValue(maxBookings.toString());
        }
        if (bookingLimit.offerReschedule !== undefined) {
          setOfferReschedule(bookingLimit.offerReschedule);
        }
      }
    }

    const bookingWindow = eventType.bookingWindow;
    const hasBookingWindow = bookingWindow && !("disabled" in bookingWindow);
    if (hasBookingWindow) {
      setLimitFutureBookings(true);
      if (bookingWindow.type === "range") {
        setFutureBookingType("range");
        const windowValue = bookingWindow.value;
        const isValidRange = Array.isArray(windowValue) && windowValue.length === 2;
        if (isValidRange) {
          setRangeStartDate(windowValue[0]);
          setRangeEndDate(windowValue[1]);
        }
      } else {
        setFutureBookingType("rolling");
        if (typeof bookingWindow.value === "number") {
          setRollingDays(bookingWindow.value.toString());
        }
        setRollingCalendarDays(bookingWindow.type === "calendarDays");
      }
    }

    const metadata = eventType.metadata;

    // Handle disableCancelling - can be boolean or object { disabled: boolean }
    const disableCancellingValue = eventTypeExt.disableCancelling;
    if (disableCancellingValue !== undefined) {
      if (typeof disableCancellingValue === "boolean") {
        setDisableCancelling(disableCancellingValue);
      } else if (
        typeof disableCancellingValue === "object" &&
        "disabled" in disableCancellingValue
      ) {
        setDisableCancelling(disableCancellingValue.disabled);
      }
    } else if (metadata?.disableCancelling) {
      setDisableCancelling(true);
    }

    // Handle disableRescheduling - can be boolean or object { disabled: boolean, minutesBefore?: number }
    const disableReschedulingValue = eventTypeExt.disableRescheduling;
    if (disableReschedulingValue !== undefined) {
      if (typeof disableReschedulingValue === "boolean") {
        setDisableRescheduling(disableReschedulingValue);
      } else if (
        typeof disableReschedulingValue === "object" &&
        "disabled" in disableReschedulingValue
      ) {
        setDisableRescheduling(disableReschedulingValue.disabled);
      }
    } else if (metadata?.disableRescheduling) {
      setDisableRescheduling(true);
    }

    // Handle calVideoSettings.sendTranscriptionEmails (API V2) or sendCalVideoTranscription (legacy)
    if (eventTypeExt.calVideoSettings?.sendTranscriptionEmails !== undefined) {
      setSendCalVideoTranscription(eventTypeExt.calVideoSettings.sendTranscriptionEmails);
    } else if (eventTypeExt.sendCalVideoTranscription !== undefined) {
      setSendCalVideoTranscription(eventTypeExt.sendCalVideoTranscription);
    } else if (metadata?.sendCalVideoTranscription) {
      setSendCalVideoTranscription(true);
    } else {
      setSendCalVideoTranscription(false);
    }

    if (eventTypeExt.interfaceLanguage) {
      setInterfaceLanguageEnabled(true);
      setInterfaceLanguage(eventTypeExt.interfaceLanguage);
    }

    // Load showOptimizedSlots (API V2)
    if (eventTypeExt.showOptimizedSlots !== undefined) {
      setShowOptimizedSlots(eventTypeExt.showOptimizedSlots);
    }

    if (metadata) {
      const calendarEventNameValue = metadata.calendarEventName;
      if (typeof calendarEventNameValue === "string") {
        setCalendarEventName(calendarEventNameValue);
      }
      const addToCalendarEmailValue = metadata.addToCalendarEmail;
      if (typeof addToCalendarEmailValue === "string") {
        setAddToCalendarEmail(addToCalendarEmailValue);
      }
    }

    // Load booker layouts
    const bookerLayouts = eventType.bookerLayouts;
    if (bookerLayouts) {
      const enabledLayouts = bookerLayouts.enabledLayouts;
      const hasEnabledLayouts = enabledLayouts && Array.isArray(enabledLayouts);
      if (hasEnabledLayouts) {
        setSelectedLayouts(enabledLayouts);
      }
      if (bookerLayouts.defaultLayout) {
        setDefaultLayout(bookerLayouts.defaultLayout);
      }
    }

    if (eventType.confirmationPolicy) {
      const policy = eventType.confirmationPolicy as ConfirmationPolicyExtended;
      const isPolicyEnabled = !("disabled" in policy) || policy.disabled === false;
      if (isPolicyEnabled) {
        setRequiresConfirmation(true);
      }
    }
    if (eventType.requiresConfirmation !== undefined) {
      setRequiresConfirmation(eventType.requiresConfirmation);
    }

    if (eventType.requiresBookerEmailVerification !== undefined) {
      setRequiresBookerEmailVerification(eventType.requiresBookerEmailVerification);
    }
    if (eventType.hideCalendarNotes !== undefined) {
      setHideCalendarNotes(eventType.hideCalendarNotes);
    }
    if (eventType.lockTimeZoneToggleOnBookingPage !== undefined) {
      setLockTimezone(eventType.lockTimeZoneToggleOnBookingPage);
    }
    if (eventTypeExt.lockedTimeZone) {
      setLockedTimezone(eventTypeExt.lockedTimeZone);
    }
    if (eventTypeExt.hideCalendarEventDetails !== undefined) {
      setHideCalendarEventDetails(eventTypeExt.hideCalendarEventDetails);
    }
    if (eventTypeExt.hideOrganizerEmail !== undefined) {
      setHideOrganizerEmail(eventTypeExt.hideOrganizerEmail);
    }

    if (eventType.successRedirectUrl) {
      setRedirectEnabled(true);
      setSuccessRedirectUrl(eventType.successRedirectUrl);
    }
    if (eventType.forwardParamsSuccessRedirect !== undefined) {
      setForwardParamsSuccessRedirect(eventType.forwardParamsSuccessRedirect);
    }

    const eventTypeExtColor = eventTypeExt.color;
    if (eventTypeExtColor) {
      if (eventTypeExtColor.lightThemeHex) {
        setEventTypeColorLight(eventTypeExtColor.lightThemeHex);
      }
      if (eventTypeExtColor.darkThemeHex) {
        setEventTypeColorDark(eventTypeExtColor.darkThemeHex);
      }
    }
    const eventTypeColor = eventType.eventTypeColor;
    if (eventTypeColor) {
      if (eventTypeColor.lightEventTypeColor) {
        setEventTypeColorLight(eventTypeColor.lightEventTypeColor);
      }
      if (eventTypeColor.darkEventTypeColor) {
        setEventTypeColorDark(eventTypeColor.darkEventTypeColor);
      }
    }

    if (eventType.recurrence) {
      const recurrence = eventType.recurrence as RecurrenceExtended;
      const recurrenceInterval = recurrence.interval;
      const recurrenceFrequency = recurrence.frequency;
      const isRecurrenceEnabled =
        recurrence.disabled !== true && recurrenceInterval && recurrenceFrequency;
      if (isRecurrenceEnabled) {
        setRecurringEnabled(true);
        setRecurringInterval(recurrenceInterval.toString());
        const freq = recurrenceFrequency as "weekly" | "monthly" | "yearly";
        if (freq === "weekly" || freq === "monthly" || freq === "yearly") {
          setRecurringFrequency(freq);
        }
        const occurrences = recurrence.occurrences;
        setRecurringOccurrences(occurrences?.toString() || "12");
      }
    }

    const locations = eventType.locations;
    const hasLocations = locations && locations.length > 0;
    if (hasLocations) {
      const mappedLocations = locations.map((loc: ApiLocation) => mapApiLocationToItem(loc));
      setLocations(mappedLocations);

      const firstLocation = locations[0];
      if (firstLocation.address) {
        setLocationAddress(firstLocation.address);
      }
      if (firstLocation.link) {
        setLocationLink(firstLocation.link);
      }
      if (firstLocation.phone) {
        setLocationPhone(firstLocation.phone);
      }
    }

    if (eventType.disableGuests !== undefined) {
      setDisableGuests(eventType.disableGuests);
    }

    if (eventType.seats) {
      const seats = eventType.seats as SeatsExtended;
      const seatsAreEnabled =
        seats.disabled === false || (!("disabled" in seats) && seats.seatsPerTimeSlot);

      if (seatsAreEnabled) {
        setSeatsEnabled(true);
        if (seats.seatsPerTimeSlot) {
          setSeatsPerTimeSlot(seats.seatsPerTimeSlot.toString());
        }
        if (seats.showAttendeeInfo !== undefined) {
          setShowAttendeeInfo(seats.showAttendeeInfo);
        }
        if (seats.showAvailabilityCount !== undefined) {
          setShowAvailabilityCount(seats.showAvailabilityCount);
        }
      }
    }
  }, []);

  const fetchEventTypeData = useCallback(async () => {
    if (!id) return;

    let eventType: EventType | null = null;
    try {
      eventType = await CalComAPIService.getEventTypeById(parseInt(id, 10));
    } catch (error) {
      safeLogError("Failed to fetch event type data:", error);
      return;
    }

    if (eventType) {
      applyEventTypeData(eventType);
    }
  }, [id, applyEventTypeData]);

  useEffect(() => {
    if (activeTab === "availability") {
      fetchSchedules();
    }
    if (activeTab === "basics") {
      fetchConferencingOptions();
    }
  }, [activeTab, fetchConferencingOptions, fetchSchedules]);

  useEffect(() => {
    // Fetch event type data and conferencing options on initial load
    fetchEventTypeData();
    fetchConferencingOptions();
  }, [fetchConferencingOptions, fetchEventTypeData]);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const userUsername = await CalComAPIService.getUsername();
        setUsername(userUsername);
      } catch (error) {
        safeLogError("Failed to fetch username:", error);
      }
    };
    fetchUsername();
  }, []);

  const formatTime = (time: string) => {
    // Handle different time formats that might come from the API
    // Extract conditionals outside try/catch for React Compiler
    const isColonFormat = time.includes(":");

    let date: Date;

    if (isColonFormat) {
      // Format like "09:00" or "09:00:00"
      const parts = time.split(":").map(Number);
      const hours = parts[0];
      const minutes = parts[1] || 0;
      date = new Date();
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Other formats
      date = new Date(time);
    }

    // Check if the date is valid
    const isValidDate = !Number.isNaN(date.getTime());
    if (!isValidDate) {
      return time; // Return original if parsing fails
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDaySchedule = () => {
    if (!selectedScheduleDetails) {
      return [];
    }

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const daySchedule = daysOfWeek.map((day) => {
      // Try different possible day formats
      const dayLower = day.toLowerCase();
      const dayUpper = day.toUpperCase();
      const dayShort = day.substring(0, 3).toLowerCase(); // mon, tue, etc.
      const dayShortUpper = day.substring(0, 3).toUpperCase();

      // Find ALL matching availability slots for this day (not just the first one)
      const matchingSlots =
        selectedScheduleDetails.availability?.filter((avail) => {
          if (!avail.days || !Array.isArray(avail.days)) return false;

          return avail.days.some(
            (d) =>
              d === dayLower ||
              d === dayUpper ||
              d === day ||
              d === dayShort ||
              d === dayShortUpper ||
              d.toLowerCase() === dayLower
          );
        }) || [];

      // Map to time slots array
      const timeSlots = matchingSlots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));

      return {
        day,
        available: timeSlots.length > 0,
        startTime: timeSlots[0]?.startTime,
        endTime: timeSlots[0]?.endTime,
        timeSlots, // Include all time slots for this day
      };
    });

    return daySchedule;
  };

  const handlePreview = async () => {
    if (!bookingUrl) {
      showErrorAlert("Error", "Booking URL not available. Please save the event type first.");
      return;
    }
    await openInAppBrowser(bookingUrl, "event type preview");
  };

  const handleCopyLink = async () => {
    if (!bookingUrl) {
      showErrorAlert("Error", "Booking URL not available. Please save the event type first.");
      return;
    }
    await Clipboard.setStringAsync(bookingUrl);
    showSuccessAlert("Success", "Link copied!");
  };

  const handleDelete = () => {
    Alert.alert("Delete Event Type", `Are you sure you want to delete "${eventTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const eventTypeId = parseInt(id, 10);

          if (Number.isNaN(eventTypeId)) {
            showErrorAlert("Error", "Invalid event type ID");
            return;
          }

          try {
            await deleteEventType(eventTypeId);

            showSuccessAlert("Success", "Event type deleted successfully");
            router.back();
          } catch (error) {
            safeLogError("Failed to delete event type:", error);
            showErrorAlert("Error", "Failed to delete event type. Please try again.");
          }
        },
      },
    ]);
  };

  // Calculate current form state efficiently
  const currentFormState = useMemo(
    () => ({
      // Basics
      eventTitle,
      eventSlug,
      eventDescription,
      eventDuration,
      isHidden,
      locations,
      disableGuests,

      // Multiple durations
      allowMultipleDurations,
      selectedDurations,
      defaultDuration,

      // Availability
      selectedScheduleId: selectedSchedule?.id,

      // Limits
      beforeEventBuffer,
      afterEventBuffer,
      minimumNoticeValue,
      minimumNoticeUnit,
      slotInterval,
      limitBookingFrequency,
      frequencyLimits,
      limitTotalDuration,
      durationLimits,
      onlyShowFirstAvailableSlot,
      maxActiveBookingsPerBooker,
      maxActiveBookingsValue,
      offerReschedule,
      limitFutureBookings,
      futureBookingType,
      rollingDays,
      rollingCalendarDays,
      rangeStartDate,
      rangeEndDate,

      // Advanced
      requiresConfirmation,
      requiresBookerEmailVerification,
      hideCalendarNotes,
      hideCalendarEventDetails,
      hideOrganizerEmail,
      lockTimezone,
      allowReschedulingPastEvents,
      allowBookingThroughRescheduleLink,
      successRedirectUrl,
      forwardParamsSuccessRedirect,
      customReplyToEmail,
      eventTypeColorLight,
      eventTypeColorDark,
      calendarEventName,
      addToCalendarEmail,
      selectedLayouts,
      defaultLayout,
      disableCancelling,
      disableRescheduling,
      sendCalVideoTranscription,

      interfaceLanguage,
      showOptimizedSlots,

      // Seats
      seatsEnabled,
      seatsPerTimeSlot,
      showAttendeeInfo,
      showAvailabilityCount,

      // Recurring
      recurringEnabled,
      recurringInterval,
      recurringFrequency,
      recurringOccurrences,
    }),
    [
      eventTitle,
      eventSlug,
      eventDescription,
      eventDuration,
      isHidden,
      locations,
      disableGuests,
      allowMultipleDurations,
      selectedDurations,
      defaultDuration,
      selectedSchedule,
      beforeEventBuffer,
      afterEventBuffer,
      minimumNoticeValue,
      minimumNoticeUnit,
      slotInterval,
      limitBookingFrequency,
      frequencyLimits,
      limitTotalDuration,
      durationLimits,
      onlyShowFirstAvailableSlot,
      maxActiveBookingsPerBooker,
      maxActiveBookingsValue,
      offerReschedule,
      limitFutureBookings,
      futureBookingType,
      rollingDays,
      rollingCalendarDays,
      rangeStartDate,
      rangeEndDate,
      requiresConfirmation,
      requiresBookerEmailVerification,
      hideCalendarNotes,
      hideCalendarEventDetails,
      hideOrganizerEmail,
      lockTimezone,
      allowReschedulingPastEvents,
      allowBookingThroughRescheduleLink,
      successRedirectUrl,
      forwardParamsSuccessRedirect,
      customReplyToEmail,
      eventTypeColorLight,
      eventTypeColorDark,
      calendarEventName,
      addToCalendarEmail,
      selectedLayouts,
      defaultLayout,
      disableCancelling,
      disableRescheduling,
      sendCalVideoTranscription,
      interfaceLanguage,
      showOptimizedSlots,
      seatsEnabled,
      seatsPerTimeSlot,
      showAttendeeInfo,
      showAvailabilityCount,
      recurringEnabled,
      recurringInterval,
      recurringFrequency,
      recurringOccurrences,
    ]
  );

  // Calculate isDirty state
  const isDirty = useMemo(() => {
    // For new event types (id="new"), we always want to enable save if required fields are filled
    // But for now, let's stick to the dirty check logic which applies mostly to updates
    if (id === "new") {
      // For create mode, we can consider it "dirty" if title and slug are present
      // or just always enabled. The requirement was "when user changes something".
      // Usually for "new" forms, the button IS enabled, or disabled until valid.
      // Let's assume the requirement "enable/disable based on changes" specifically targets the EDIT flow.
      // But to be safe and consistent with "disable until change", we can check if it differs from initial empty state?
      // Actually, for "Create", it's usually better to be enabled or validated.
      // However, the user request: "we have this save button in event types, so when user changes something then only i want this save button to enable"
      // This strongly implies the Edit case.
      // For "new", returning true (always dirty/ready) is a safe default to avoid blocking creation.
      return true;
    }

    if (!eventTypeData) return false;

    const payload = buildPartialUpdatePayload(currentFormState, eventTypeData);
    return Object.keys(payload).length > 0;
  }, [currentFormState, eventTypeData, id]);

  const handleSave = useCallback(async () => {
    if (!id) {
      showErrorAlert("Error", "Event type ID is missing");
      return;
    }

    // Validate required fields
    if (!eventTitle || !eventSlug) {
      showErrorAlert("Error", "Title and slug are required");
      return;
    }

    const durationNum = parseInt(eventDuration, 10);
    if (Number.isNaN(durationNum) || durationNum <= 0) {
      showErrorAlert("Error", "Duration must be a positive number");
      return;
    }

    // Validate locations before saving
    if (locations.length > 0) {
      for (const loc of locations) {
        const validation = validateLocationItem(loc);
        if (!validation.valid) {
          showErrorAlert("Error", validation.error || "Invalid location");
          return;
        }
      }
    }

    // Detect create vs update mode
    const isCreateMode = id === "new";

    // Extract values with optional chaining outside try/catch for React Compiler
    const selectedScheduleId = selectedSchedule?.id;

    if (isCreateMode) {
      // For CREATE mode, build full payload
      const payload: CreateEventTypePayload = {
        title: eventTitle,
        slug: eventSlug,
        lengthInMinutes: durationNum,
      };

      if (eventDescription) {
        payload.description = eventDescription;
      }

      if (locations.length > 0) {
        payload.locations = locations.map((loc) => mapItemToApiLocation(loc));
      }

      if (selectedScheduleId !== undefined) {
        payload.scheduleId = selectedScheduleId;
      }

      payload.hidden = isHidden;

      // Create new event type using mutation hook
      try {
        await createEventType(payload);
      } catch (error) {
        safeLogError("Failed to save event type:", error);
        showErrorAlert("Error", "Failed to create event type. Please try again.");
        return;
      }
      showSuccessAlert("Success", "Event type created successfully");
      router.back();
    } else {
      // For UPDATE mode, use partial update - only send changed fields
      // Using the memoized currentFormState
      const payload = buildPartialUpdatePayload(currentFormState, eventTypeData);

      if (Object.keys(payload).length === 0) {
        // This should theoretically strictly not be reached if button is disabled,
        // but it acts as a safeguard.
        // return;
      }

      // Update event type using mutation hook with optimistic updates
      try {
        await updateEventType({ id: parseInt(id, 10), updates: payload });
      } catch (error) {
        safeLogError("Failed to save event type:", error);
        showErrorAlert("Error", "Failed to update event type. Please try again.");
        return;
      }
      showSuccessAlert("Success", "Event type updated successfully");
      // No need to manually refresh - cache is updated by the mutation hook
    }
  }, [
    id,
    eventTitle,
    eventSlug,
    eventDuration,
    locations,
    selectedSchedule?.id,
    eventDescription,
    isHidden,
    createEventType,
    router,
    currentFormState,
    eventTypeData,
    updateEventType,
  ]);

  const headerTitle = id === "new" ? "Create Event Type" : truncateTitle(title);
  const saveButtonText = id === "new" ? "Create" : "Save";

  const renderHeaderLeft = useCallback(
    () => (
      <HeaderButtonWrapper side="left">
        <AppPressable
          onPress={() => router.back()}
          className="mr-2 h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white dark:border-[#262626] dark:bg-[#171717]"
        >
          <Ionicons name="chevron-back" size={20} color={isDarkMode ? "#FFFFFF" : "#000000"} />
        </AppPressable>
      </HeaderButtonWrapper>
    ),
    [router, isDarkMode]
  );

  const renderHeaderRight = useCallback(
    () => (
      <HeaderButtonWrapper side="right">
        <View className="flex-row items-center" style={{ gap: Platform.OS === "web" ? 24 : 8 }}>
          {/* Tab Navigation Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AppPressable className="h-10 flex-row items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 dark:border-[#262626] dark:bg-[#171717]">
                <Text
                  className="text-[15px] font-medium text-[#000000] dark:text-white"
                  numberOfLines={1}
                >
                  {tabs.find((tab) => tab.id === activeTab)?.label ?? "Basics"}
                </Text>
              </AppPressable>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              insets={{ top: 60, bottom: 20, left: 12, right: 12 }}
              sideOffset={8}
              className="w-44"
              align="end"
            >
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <DropdownMenuItem key={tab.id} onPress={() => setActiveTab(tab.id)}>
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : tab.icon}
                        size={16}
                        color={isSelected ? (isDarkMode ? "#FFFFFF" : "#000000") : "#666"}
                      />
                      <Text
                        className={
                          isSelected
                            ? "text-base font-semibold text-[#000000] dark:text-white"
                            : "text-base text-popover-foreground"
                        }
                      >
                        {tab.label}
                      </Text>
                    </View>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save Button */}
          <AppPressable
            onPress={handleSave}
            disabled={isSaving || !isDirty}
            className={`h-10 flex-row items-center justify-center rounded-full border px-5 ${
              isSaving || !isDirty
                ? "border-[#E5E5EA] bg-[#E5E5EA] dark:border-[#262626] dark:bg-[#262626]"
                : "border-black bg-black dark:border-white dark:bg-white"
            }`}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={
                  isSaving || !isDirty
                    ? isDarkMode
                      ? "#A3A3A3"
                      : "#A3A3A3"
                    : isDarkMode
                      ? "#000000"
                      : "#FFFFFF"
                }
              />
            ) : (
              <Text
                className={`text-[15px] font-medium ${
                  isSaving || !isDirty ? "text-[#A3A3A3]" : isDarkMode ? "text-black" : "text-white"
                }`}
              >
                {saveButtonText}
              </Text>
            )}
          </AppPressable>
        </View>
      </HeaderButtonWrapper>
    ),
    [activeTab, isDarkMode, handleSave, isSaving, isDirty, saveButtonText]
  );

  // Force header update on Android/Web when state changes
  const navigation = useNavigation();
  useEffect(() => {
    if (Platform.OS === "android" || Platform.OS === "web") {
      navigation.setOptions({
        headerRight: renderHeaderRight,
        headerLeft: renderHeaderLeft,
      });
    }
  }, [navigation, renderHeaderRight, renderHeaderLeft]);

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackButtonDisplayMode: "minimal",
          headerShown: Platform.OS !== "ios",
          headerTransparent: Platform.select({
            ios: true,
          }),
          headerStyle: {
            backgroundColor: isDarkMode ? "black" : "white",
          },
          headerShadowVisible: false,
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header
          blurEffect={isLiquidGlassAvailable() ? undefined : isDarkMode ? "dark" : "light"}
        >
          <Stack.Header.Right>
            <Stack.Header.Menu>
              <Stack.Header.Label>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </Stack.Header.Label>
              {tabs.map((tab) => (
                <Stack.Header.MenuAction
                  key={tab.id}
                  icon={
                    activeTab === tab.id
                      ? "checkmark.circle.fill"
                      : tab.icon === "link"
                        ? "link"
                        : tab.icon === "calendar"
                          ? "calendar"
                          : tab.icon === "time"
                            ? "clock"
                            : tab.icon === "settings"
                              ? "gearshape"
                              : tab.icon === "refresh"
                                ? "arrow.clockwise"
                                : "ellipsis"
                  }
                  onPress={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>
            <Stack.Header.Button
              onPress={handleSave}
              disabled={isSaving || !isDirty}
              variant="prominent"
              tintColor={isDarkMode ? "#FFF" : "#000"}
            >
              {saveButtonText}
            </Stack.Header.Button>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <View className="flex-1 bg-[#f8f9fa] dark:bg-black">
        <ScrollView
          style={{
            flex: 1,
          }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: activeTab === "limits" || activeTab === "advanced" ? 280 : 200,
          }}
          contentInsetAdjustmentBehavior="automatic"
        >
          {activeTab === "basics" ? (
            <BasicsTab
              eventTitle={eventTitle}
              setEventTitle={setEventTitle}
              eventDescription={eventDescription}
              setEventDescription={setEventDescription}
              username={username}
              eventSlug={eventSlug}
              setEventSlug={setEventSlug}
              allowMultipleDurations={allowMultipleDurations}
              setAllowMultipleDurations={setAllowMultipleDurations}
              eventDuration={eventDuration}
              setEventDuration={setEventDuration}
              selectedDurations={selectedDurations}
              setShowDurationDropdown={setShowDurationDropdown}
              defaultDuration={defaultDuration}
              setDefaultDuration={setDefaultDuration}
              setShowDefaultDurationDropdown={setShowDefaultDurationDropdown}
              // Multiple locations support
              locations={locations}
              onAddLocation={handleAddLocation}
              onRemoveLocation={handleRemoveLocation}
              onUpdateLocation={handleUpdateLocation}
              locationOptions={getLocationOptionsForDropdown()}
              conferencingLoading={conferencingLoading}
              bookingUrl={bookingUrl}
            />
          ) : null}

          {/* Duration Multi-Select Modal */}
          <Modal
            visible={showDurationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDurationDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-black/30"
              activeOpacity={1}
              onPress={() => setShowDurationDropdown(false)}
            >
              <View className="max-h-[80%] min-w-[320px] max-w-[90%] overflow-hidden rounded-[28px]">
                {isLiquidGlassAvailable() && Platform.OS === "ios" ? (
                  <GlassView glassEffectStyle="regular" className="p-0">
                    <View className="flex-col p-6">
                      <Text className="mb-5 text-center text-[19px] font-bold text-black dark:text-white">
                        Select Available Durations
                      </Text>
                      <ScrollView style={{ maxHeight: 400, marginBottom: 20 }}>
                        {availableDurations.map((duration, index) => (
                          <TouchableOpacity
                            key={duration}
                            className={`flex-row items-center justify-between py-3.5 ${
                              index < availableDurations.length - 1
                                ? "border-b border-black/10 dark:border-white/10"
                                : ""
                            }`}
                            onPress={() => toggleDurationSelection(duration)}
                          >
                            <Text
                              className={`text-[17px] text-black dark:text-white ${
                                selectedDurations.includes(duration) ? "font-bold" : "font-medium"
                              }`}
                            >
                              {duration}
                            </Text>
                            {selectedDurations.includes(duration) ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={isDarkMode ? "#FFFFFF" : "#000000"}
                              />
                            ) : (
                              <View className="h-6 w-6 rounded-full border-2 border-black/20 dark:border-white/20" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TouchableOpacity
                        className="items-center rounded-2xl bg-black py-4 active:opacity-80 dark:bg-white"
                        onPress={() => setShowDurationDropdown(false)}
                      >
                        <Text className="text-[17px] font-bold text-white dark:text-black">
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </GlassView>
                ) : (
                  <View className="bg-white p-6 dark:bg-[#171717]">
                    <Text className="mb-5 text-center text-[19px] font-bold text-[#333] dark:text-white">
                      Select Available Durations
                    </Text>
                    <ScrollView style={{ maxHeight: 400, marginBottom: 20 }}>
                      {availableDurations.map((duration, index) => (
                        <TouchableOpacity
                          key={duration}
                          className={`flex-row items-center justify-between py-3.5 ${
                            index < availableDurations.length - 1
                              ? "border-b border-gray-100 dark:border-[#4D4D4D]"
                              : ""
                          }`}
                          onPress={() => toggleDurationSelection(duration)}
                        >
                          <Text
                            className={`text-[17px] text-[#333] dark:text-white ${
                              selectedDurations.includes(duration) ? "font-bold" : "font-medium"
                            }`}
                          >
                            {duration}
                          </Text>
                          {selectedDurations.includes(duration) ? (
                            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                          ) : (
                            <View className="h-6 w-6 rounded-full border-2 border-gray-200 dark:border-[#4D4D4D]" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      className="items-center rounded-2xl bg-black py-4"
                      onPress={() => setShowDurationDropdown(false)}
                    >
                      <Text className="text-[17px] font-bold text-white">Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Default Duration Dropdown Modal */}
          <Modal
            visible={showDefaultDurationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDefaultDurationDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-black/30"
              activeOpacity={1}
              onPress={() => setShowDefaultDurationDropdown(false)}
            >
              <View className="max-h-[80%] min-w-[320px] max-w-[90%] overflow-hidden rounded-[28px]">
                {isLiquidGlassAvailable() && Platform.OS === "ios" ? (
                  <GlassView glassEffectStyle="regular" className="p-0">
                    <View className="flex-col p-6">
                      <Text className="mb-5 text-center text-[19px] font-bold text-black dark:text-white">
                        Select Default Duration
                      </Text>
                      <ScrollView style={{ maxHeight: 400 }}>
                        {selectedDurations.map((duration, index) => (
                          <TouchableOpacity
                            key={duration}
                            className={`flex-row items-center justify-between py-3.5 ${
                              index < selectedDurations.length - 1
                                ? "border-b border-black/10 dark:border-white/10"
                                : ""
                            }`}
                            onPress={() => {
                              setDefaultDuration(duration);
                              setShowDefaultDurationDropdown(false);
                            }}
                          >
                            <Text
                              className={`text-[17px] text-black dark:text-white ${
                                defaultDuration === duration ? "font-bold" : "font-medium"
                              }`}
                            >
                              {duration}
                            </Text>
                            {defaultDuration === duration ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={isDarkMode ? "#FFFFFF" : "#000000"}
                              />
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </GlassView>
                ) : (
                  <View className="bg-white p-6 dark:bg-[#171717]">
                    <Text className="mb-5 text-center text-[19px] font-bold text-[#333] dark:text-white">
                      Select Default Duration
                    </Text>
                    <ScrollView style={{ maxHeight: 400 }}>
                      {selectedDurations.map((duration, index) => (
                        <TouchableOpacity
                          key={duration}
                          className={`flex-row items-center justify-between py-3.5 ${
                            index < selectedDurations.length - 1
                              ? "border-b border-gray-100 dark:border-[#4D4D4D]"
                              : ""
                          }`}
                          onPress={() => {
                            setDefaultDuration(duration);
                            setShowDefaultDurationDropdown(false);
                          }}
                        >
                          <Text
                            className={`text-[17px] text-[#333] dark:text-white ${
                              defaultDuration === duration ? "font-bold" : "font-medium"
                            }`}
                          >
                            {duration}
                          </Text>
                          {defaultDuration === duration ? (
                            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Schedule Dropdown Modal */}
          <Modal
            visible={showScheduleDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowScheduleDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-black/30"
              activeOpacity={1}
              onPress={() => setShowScheduleDropdown(false)}
            >
              <View className="max-h-[80%] min-w-[320px] max-w-[90%] overflow-hidden rounded-[28px]">
                {isLiquidGlassAvailable() && Platform.OS === "ios" ? (
                  <GlassView glassEffectStyle="regular" className="p-0">
                    <View className="flex-col p-6">
                      <Text className="mb-5 text-center text-[19px] font-bold text-black dark:text-white">
                        Select Schedule
                      </Text>
                      <ScrollView style={{ maxHeight: 400 }}>
                        {schedules.map((schedule, index) => (
                          <TouchableOpacity
                            key={schedule.id}
                            className={`flex-row items-center justify-between py-3.5 ${
                              index < schedules.length - 1
                                ? "border-b border-black/10 dark:border-white/10"
                                : ""
                            }`}
                            onPress={() => {
                              setSelectedSchedule(schedule);
                              fetchScheduleDetails(schedule.id);
                              setShowScheduleDropdown(false);
                            }}
                          >
                            <View className="flex-1">
                              <Text
                                className={`text-[17px] text-black dark:text-white ${
                                  selectedSchedule?.id === schedule.id ? "font-bold" : "font-medium"
                                }`}
                              >
                                {schedule.name}
                              </Text>
                              {schedule.isDefault && (
                                <Text className="text-[13px] text-black/50 dark:text-white/50">
                                  Default
                                </Text>
                              )}
                            </View>
                            {selectedSchedule?.id === schedule.id ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={isDarkMode ? "#FFFFFF" : "#000000"}
                              />
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </GlassView>
                ) : (
                  <View className="bg-white p-6 dark:bg-[#171717]">
                    <Text className="mb-5 text-center text-[19px] font-bold text-[#333] dark:text-white">
                      Select Schedule
                    </Text>
                    <ScrollView style={{ maxHeight: 400 }}>
                      {schedules.map((schedule, index) => (
                        <TouchableOpacity
                          key={schedule.id}
                          className={`flex-row items-center justify-between py-3.5 ${
                            index < schedules.length - 1
                              ? "border-b border-gray-100 dark:border-[#4D4D4D]"
                              : ""
                          }`}
                          onPress={() => {
                            setSelectedSchedule(schedule);
                            fetchScheduleDetails(schedule.id);
                            setShowScheduleDropdown(false);
                          }}
                        >
                          <View className="flex-1">
                            <Text
                              className={`text-[17px] text-[#333] dark:text-white ${
                                selectedSchedule?.id === schedule.id ? "font-bold" : "font-medium"
                              }`}
                            >
                              {schedule.name}
                            </Text>
                            {schedule.isDefault && (
                              <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">
                                Default
                              </Text>
                            )}
                          </View>
                          {selectedSchedule?.id === schedule.id ? (
                            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Timezone Dropdown Modal */}
          <Modal
            visible={showTimezoneDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimezoneDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowTimezoneDropdown(false)}
            >
              <View
                className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]"
                style={{ maxHeight: "70%" }}
              >
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  Select Timezone
                </Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  {[
                    "America/New_York",
                    "America/Chicago",
                    "America/Denver",
                    "America/Los_Angeles",
                    "Europe/London",
                    "Europe/Paris",
                    "Europe/Berlin",
                    "Asia/Tokyo",
                    "Asia/Shanghai",
                    "Asia/Kolkata",
                    "Australia/Sydney",
                    "UTC",
                  ].map((tz) => (
                    <TouchableOpacity
                      key={tz}
                      className={`mb-1 flex-row items-center justify-between rounded-lg px-2 py-3 md:px-4 ${
                        selectedTimezone === tz ||
                        (selectedScheduleDetails?.timeZone === tz && !selectedTimezone)
                          ? "bg-[#F0F0F0] dark:bg-[#262626]"
                          : "active:bg-[#F0F0F0] dark:active:bg-[#262626]"
                      }`}
                      onPress={() => {
                        setSelectedTimezone(tz);
                        setShowTimezoneDropdown(false);
                      }}
                    >
                      <Text
                        className={`text-base text-[#333] dark:text-white ${
                          selectedTimezone === tz ||
                          (selectedScheduleDetails?.timeZone === tz && !selectedTimezone)
                            ? "font-semibold"
                            : ""
                        }`}
                      >
                        {tz}
                      </Text>
                      {selectedTimezone === tz ||
                      (selectedScheduleDetails?.timeZone === tz && !selectedTimezone) ? (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Before Event Buffer Dropdown Modal */}
          <Modal
            visible={showBeforeBufferDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBeforeBufferDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowBeforeBufferDropdown(false)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  Before event buffer
                </Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      beforeEventBuffer === option ? "bg-[#F0F0F0] dark:bg-[#262626]" : ""
                    }`}
                    onPress={() => {
                      setBeforeEventBuffer(option);
                      setShowBeforeBufferDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] dark:text-white ${
                        beforeEventBuffer === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {beforeEventBuffer === option ? (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* After Event Buffer Dropdown Modal */}
          <Modal
            visible={showAfterBufferDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAfterBufferDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowAfterBufferDropdown(false)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  After event buffer
                </Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      afterEventBuffer === option ? "bg-[#F0F0F0] dark:bg-[#262626]" : ""
                    }`}
                    onPress={() => {
                      setAfterEventBuffer(option);
                      setShowAfterBufferDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] dark:text-white ${
                        afterEventBuffer === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {afterEventBuffer === option ? (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Minimum Notice Unit Dropdown Modal */}
          <Modal
            visible={showMinimumNoticeUnitDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMinimumNoticeUnitDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowMinimumNoticeUnitDropdown(false)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  Time unit
                </Text>
                {timeUnitOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      minimumNoticeUnit === option ? "bg-[#F0F0F0] dark:bg-[#262626]" : ""
                    }`}
                    onPress={() => {
                      setMinimumNoticeUnit(option);
                      setShowMinimumNoticeUnitDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] dark:text-white ${
                        minimumNoticeUnit === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {minimumNoticeUnit === option ? (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Frequency Unit Dropdown Modal */}
          <Modal
            visible={showFrequencyUnitDropdown !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFrequencyUnitDropdown(null)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowFrequencyUnitDropdown(null)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  Frequency unit
                </Text>
                {frequencyUnitOptions.map((option) => {
                  const selectedLimit = frequencyLimits.find(
                    (limit) => limit.id === showFrequencyUnitDropdown
                  );
                  const isSelected = selectedLimit?.unit === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      className={`mb-1 flex-row items-center justify-between rounded-lg px-2 py-3 md:px-4 ${
                        isSelected ? "bg-[#F0F0F0] dark:bg-[#262626]" : ""
                      }`}
                      onPress={() => {
                        if (showFrequencyUnitDropdown) {
                          updateFrequencyLimit(showFrequencyUnitDropdown, "unit", option);
                        }
                        setShowFrequencyUnitDropdown(null);
                      }}
                    >
                      <Text
                        className={`text-base text-[#333] dark:text-white ${isSelected ? "font-semibold" : ""}`}
                      >
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Duration Unit Dropdown Modal */}
          <Modal
            visible={showDurationUnitDropdown !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDurationUnitDropdown(null)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowDurationUnitDropdown(null)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  Duration unit
                </Text>
                {durationUnitOptions.map((option) => {
                  const selectedLimit = durationLimits.find(
                    (limit) => limit.id === showDurationUnitDropdown
                  );
                  const isSelected = selectedLimit?.unit === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      className={`mb-1 flex-row items-center justify-between rounded-lg px-2 py-3 md:px-4 ${
                        isSelected ? "bg-[#F0F0F0] dark:bg-[#262626]" : ""
                      }`}
                      onPress={() => {
                        if (showDurationUnitDropdown) {
                          updateDurationLimit(showDurationUnitDropdown, "unit", option);
                        }
                        setShowDurationUnitDropdown(null);
                      }}
                    >
                      <Text
                        className={`text-base text-[#333] dark:text-white ${isSelected ? "font-semibold" : ""}`}
                      >
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Slot Interval Dropdown Modal */}
          <Modal
            visible={showSlotIntervalDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSlotIntervalDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowSlotIntervalDropdown(false)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  Slot interval
                </Text>
                {slotIntervalOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      slotInterval === option ? "bg-[#F0F0F0] dark:bg-[#262626]" : ""
                    }`}
                    onPress={() => {
                      setSlotInterval(option);
                      setShowSlotIntervalDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] dark:text-white ${
                        slotInterval === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {slotInterval === option ? (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Recurring Frequency Dropdown Modal */}
          <Modal
            visible={showRecurringFrequencyDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowRecurringFrequencyDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowRecurringFrequencyDropdown(false)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5 dark:bg-[#171717]">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333] dark:text-white">
                  Repeats every
                </Text>
                {(["weekly", "monthly", "yearly"] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      recurringFrequency === option ? "bg-[#F0F0F0] dark:bg-[#262626]" : ""
                    }`}
                    onPress={() => {
                      setRecurringFrequency(option);
                      setShowRecurringFrequencyDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base capitalize text-[#333] dark:text-white ${
                        recurringFrequency === option ? "font-semibold" : ""
                      }`}
                    >
                      {option === "weekly" ? "week" : option === "monthly" ? "month" : "year"}
                    </Text>
                    {recurringFrequency === option ? (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {activeTab === "availability" ? (
            <AvailabilityTab
              selectedSchedule={selectedSchedule}
              setShowScheduleDropdown={setShowScheduleDropdown}
              schedulesLoading={schedulesLoading}
              scheduleDetailsLoading={scheduleDetailsLoading}
              selectedScheduleDetails={selectedScheduleDetails}
              getDaySchedules={getDaySchedule}
              formatTime={formatTime}
              selectedTimezone={selectedTimezone}
              schedules={schedules}
              setSelectedSchedule={setSelectedSchedule}
            />
          ) : null}

          {activeTab === "limits" ? (
            <LimitsTab
              beforeEventBuffer={beforeEventBuffer}
              setBeforeEventBuffer={setBeforeEventBuffer}
              setShowBeforeBufferDropdown={setShowBeforeBufferDropdown}
              afterEventBuffer={afterEventBuffer}
              setAfterEventBuffer={setAfterEventBuffer}
              setShowAfterBufferDropdown={setShowAfterBufferDropdown}
              minimumNoticeValue={minimumNoticeValue}
              setMinimumNoticeValue={setMinimumNoticeValue}
              minimumNoticeUnit={minimumNoticeUnit}
              setMinimumNoticeUnit={setMinimumNoticeUnit}
              setShowMinimumNoticeUnitDropdown={setShowMinimumNoticeUnitDropdown}
              slotInterval={slotInterval}
              setSlotInterval={setSlotInterval}
              setShowSlotIntervalDropdown={setShowSlotIntervalDropdown}
              limitBookingFrequency={limitBookingFrequency}
              toggleBookingFrequency={toggleBookingFrequency}
              frequencyAnimationValue={frequencyAnimationValue}
              frequencyLimits={frequencyLimits}
              updateFrequencyLimit={updateFrequencyLimit}
              setShowFrequencyUnitDropdown={setShowFrequencyUnitDropdown}
              removeFrequencyLimit={removeFrequencyLimit}
              addFrequencyLimit={addFrequencyLimit}
              onlyShowFirstAvailableSlot={onlyShowFirstAvailableSlot}
              setOnlyShowFirstAvailableSlot={setOnlyShowFirstAvailableSlot}
              limitTotalDuration={limitTotalDuration}
              toggleTotalDuration={toggleTotalDuration}
              durationAnimationValue={durationAnimationValue}
              durationLimits={durationLimits}
              updateDurationLimit={updateDurationLimit}
              setShowDurationUnitDropdown={setShowDurationUnitDropdown}
              removeDurationLimit={removeDurationLimit}
              addDurationLimit={addDurationLimit}
              maxActiveBookingsPerBooker={maxActiveBookingsPerBooker}
              setMaxActiveBookingsPerBooker={setMaxActiveBookingsPerBooker}
              maxActiveBookingsValue={maxActiveBookingsValue}
              setMaxActiveBookingsValue={setMaxActiveBookingsValue}
              offerReschedule={offerReschedule}
              setOfferReschedule={setOfferReschedule}
              limitFutureBookings={limitFutureBookings}
              setLimitFutureBookings={setLimitFutureBookings}
              futureBookingType={futureBookingType}
              setFutureBookingType={setFutureBookingType}
              rollingDays={rollingDays}
              setRollingDays={setRollingDays}
              rollingCalendarDays={rollingCalendarDays}
              setRollingCalendarDays={setRollingCalendarDays}
              rangeStartDate={rangeStartDate}
              setRangeStartDate={setRangeStartDate}
              rangeEndDate={rangeEndDate}
              setRangeEndDate={setRangeEndDate}
            />
          ) : null}

          {activeTab === "advanced" ? (
            <AdvancedTab
              requiresConfirmation={requiresConfirmation}
              setRequiresConfirmation={setRequiresConfirmation}
              requiresBookerEmailVerification={requiresBookerEmailVerification}
              setRequiresBookerEmailVerification={setRequiresBookerEmailVerification}
              hideCalendarNotes={hideCalendarNotes}
              setHideCalendarNotes={setHideCalendarNotes}
              hideCalendarEventDetails={hideCalendarEventDetails}
              setHideCalendarEventDetails={setHideCalendarEventDetails}
              hideOrganizerEmail={hideOrganizerEmail}
              setHideOrganizerEmail={setHideOrganizerEmail}
              lockTimezone={lockTimezone}
              setLockTimezone={setLockTimezone}
              lockedTimezone={lockedTimezone}
              setLockedTimezone={setLockedTimezone}
              allowReschedulingPastEvents={allowReschedulingPastEvents}
              setAllowReschedulingPastEvents={setAllowReschedulingPastEvents}
              allowBookingThroughRescheduleLink={allowBookingThroughRescheduleLink}
              setAllowBookingThroughRescheduleLink={setAllowBookingThroughRescheduleLink}
              redirectEnabled={redirectEnabled}
              setRedirectEnabled={setRedirectEnabled}
              successRedirectUrl={successRedirectUrl}
              setSuccessRedirectUrl={setSuccessRedirectUrl}
              forwardParamsSuccessRedirect={forwardParamsSuccessRedirect}
              setForwardParamsSuccessRedirect={setForwardParamsSuccessRedirect}
              customReplyToEmail={customReplyToEmail}
              setCustomReplyToEmail={setCustomReplyToEmail}
              eventTypeColorLight={eventTypeColorLight}
              setEventTypeColorLight={setEventTypeColorLight}
              eventTypeColorDark={eventTypeColorDark}
              setEventTypeColorDark={setEventTypeColorDark}
              // Seats
              seatsEnabled={seatsEnabled}
              setSeatsEnabled={setSeatsEnabled}
              seatsPerTimeSlot={seatsPerTimeSlot}
              setSeatsPerTimeSlot={setSeatsPerTimeSlot}
              showAttendeeInfo={showAttendeeInfo}
              setShowAttendeeInfo={setShowAttendeeInfo}
              showAvailabilityCount={showAvailabilityCount}
              setShowAvailabilityCount={setShowAvailabilityCount}
              // Event type ID for private links
              eventTypeId={id}
              // New API V2 props
              disableCancelling={disableCancelling}
              setDisableCancelling={setDisableCancelling}
              disableRescheduling={disableRescheduling}
              setDisableRescheduling={setDisableRescheduling}
              sendCalVideoTranscription={sendCalVideoTranscription}
              setSendCalVideoTranscription={setSendCalVideoTranscription}
              interfaceLanguageEnabled={interfaceLanguageEnabled}
              setInterfaceLanguageEnabled={setInterfaceLanguageEnabled}
              interfaceLanguage={interfaceLanguage}
              setInterfaceLanguage={setInterfaceLanguage}
              showOptimizedSlots={showOptimizedSlots}
              setShowOptimizedSlots={setShowOptimizedSlots}
            />
          ) : null}

          {activeTab === "recurring" ? (
            <RecurringTab
              recurringEnabled={recurringEnabled}
              setRecurringEnabled={setRecurringEnabled}
              recurringInterval={recurringInterval}
              setRecurringInterval={setRecurringInterval}
              recurringFrequency={recurringFrequency}
              setRecurringFrequency={setRecurringFrequency}
              recurringOccurrences={recurringOccurrences}
              setRecurringOccurrences={setRecurringOccurrences}
              setShowFrequencyDropdown={setShowRecurringFrequencyDropdown}
            />
          ) : null}

          {activeTab === "other" ? (
            <View className="gap-6">
              {/* Configure on Web */}
              <View>
                <Text
                  className="mb-2 ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72] dark:text-[#A3A3A3]"
                  style={{ letterSpacing: 0.5 }}
                >
                  Configure on Web
                </Text>
                <View className="overflow-hidden rounded-[10px] bg-white dark:bg-[#171717]">
                  {/* Apps */}
                  <View className="bg-white pl-4 dark:bg-[#171717]">
                    <TouchableOpacity
                      className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4 dark:border-[#4D4D4D]"
                      style={{ minHeight: 56 }}
                      onPress={() => {
                        if (id === "new") {
                          showInfoAlert(
                            "Info",
                            "Save the event type first to configure this setting."
                          );
                        } else if (Platform.OS === "ios") {
                          showNotAvailableAlert();
                        } else {
                          openInAppBrowser(
                            `https://app.cal.com/event-types/${id}?tabName=apps`,
                            "Apps settings"
                          );
                        }
                      }}
                      activeOpacity={0.5}
                    >
                      <View className="flex-row items-center py-2">
                        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#F2F2F7] dark:bg-[#262626]">
                          <Ionicons name="grid" size={18} color="#A3A3A3" />
                        </View>
                        <View>
                          <Text className="text-[17px] text-black dark:text-white">Apps</Text>
                          <Text className="text-[13px] text-[#A3A3A3]">Manage integrations</Text>
                        </View>
                      </View>
                      <Ionicons name="open-outline" size={18} color="#C7C7CC" />
                    </TouchableOpacity>
                  </View>

                  {/* Workflows */}
                  <View className="bg-white pl-4 dark:bg-[#171717]">
                    <TouchableOpacity
                      className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4 dark:border-[#4D4D4D]"
                      style={{ minHeight: 56 }}
                      onPress={() => {
                        if (id === "new") {
                          showInfoAlert(
                            "Info",
                            "Save the event type first to configure this setting."
                          );
                        } else if (Platform.OS === "ios") {
                          showNotAvailableAlert();
                        } else {
                          openInAppBrowser(
                            `https://app.cal.com/event-types/${id}?tabName=workflows`,
                            "Workflows settings"
                          );
                        }
                      }}
                      activeOpacity={0.5}
                    >
                      <View className="flex-row items-center py-2">
                        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#F2F2F7] dark:bg-[#262626]">
                          <Ionicons name="flash" size={18} color="#A3A3A3" />
                        </View>
                        <View>
                          <Text className="text-[17px] text-black dark:text-white">Workflows</Text>
                          <Text className="text-[13px] text-[#A3A3A3]">Automated actions</Text>
                        </View>
                      </View>
                      <Ionicons name="open-outline" size={18} color="#C7C7CC" />
                    </TouchableOpacity>
                  </View>

                  {/* Webhooks */}
                  <View className="bg-white pl-4 dark:bg-[#171717]">
                    <TouchableOpacity
                      className="flex-row items-center justify-between pr-4"
                      style={{ minHeight: 56 }}
                      onPress={() => {
                        if (id === "new") {
                          showInfoAlert(
                            "Info",
                            "Save the event type first to configure this setting."
                          );
                        } else if (Platform.OS === "ios") {
                          showNotAvailableAlert();
                        } else {
                          openInAppBrowser(
                            `https://app.cal.com/event-types/${id}?tabName=webhooks`,
                            "Webhooks settings"
                          );
                        }
                      }}
                      activeOpacity={0.5}
                    >
                      <View className="flex-row items-center py-2">
                        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#F2F2F7] dark:bg-[#262626]">
                          <Ionicons name="code" size={18} color="#A3A3A3" />
                        </View>
                        <View>
                          <Text className="text-[17px] text-black dark:text-white">Webhooks</Text>
                          <Text className="text-[13px] text-[#A3A3A3]">Event notifications</Text>
                        </View>
                      </View>
                      <Ionicons name="open-outline" size={18} color="#C7C7CC" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {activeTab === "basics" && (
            <View className="mt-6 gap-6">
              {/* Visibility */}
              <View>
                <Text
                  className="mb-2 ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72] dark:text-[#A3A3A3]"
                  style={{ letterSpacing: 0.5 }}
                >
                  Visibility
                </Text>
                <View className="overflow-hidden rounded-[10px] bg-white dark:bg-[#171717]">
                  <View className="bg-white pl-4 dark:bg-[#171717]">
                    <View
                      className="flex-row items-center justify-between pr-4"
                      style={{ height: 44, flexDirection: "row", alignItems: "center" }}
                    >
                      <Text className="text-[17px] text-black dark:text-white">Hidden</Text>
                      <View style={{ justifyContent: "center", height: "100%" }}>
                        <Switch
                          value={isHidden}
                          onValueChange={setIsHidden}
                          trackColor={{
                            false: isDarkMode ? "#404040" : "#E5E5EA",
                            true: isDarkMode ? "#34C759" : "#000000",
                          }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View>
                <Text
                  className="mb-2 ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72] dark:text-[#A3A3A3]"
                  style={{ letterSpacing: 0.5 }}
                >
                  Quick Actions
                </Text>
                <View className="overflow-hidden rounded-[10px] bg-white dark:bg-[#171717]">
                  <View className="bg-white pl-4 dark:bg-[#171717]">
                    {Platform.OS !== "ios" && (
                      <TouchableOpacity
                        className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4 dark:border-[#4D4D4D]"
                        style={{ height: 44 }}
                        onPress={handlePreview}
                        activeOpacity={0.5}
                      >
                        <Text className="text-[17px] text-black dark:text-white">Preview</Text>
                        <Ionicons name="open-outline" size={18} color="#C7C7CC" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View className="bg-white pl-4 dark:bg-[#171717]">
                    <TouchableOpacity
                      className="flex-row items-center justify-between pr-4"
                      style={{ height: 44 }}
                      onPress={handleCopyLink}
                      activeOpacity={0.5}
                    >
                      <Text className="text-[17px] text-black dark:text-white">Copy Link</Text>
                      <Ionicons name="link-outline" size={18} color="#C7C7CC" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Danger Zone */}
              <View>
                <View className="overflow-hidden rounded-[10px] bg-white dark:bg-[#171717]">
                  <View className="bg-white pl-4 dark:bg-[#171717]">
                    <TouchableOpacity
                      className="flex-row items-center justify-between pr-4"
                      style={{ height: 44 }}
                      onPress={handleDelete}
                      activeOpacity={0.5}
                    >
                      <Text className="text-[17px] text-[#FF3B30]">Delete Event Type</Text>
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
// test unused variable
