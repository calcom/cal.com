import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Activity, useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
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
import type { LocationItem, LocationOptionGroup } from "@/types/locations";
import { showErrorAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import {
  buildLocationOptions,
  mapApiLocationToItem,
  mapItemToApiLocation,
  validateLocationItem,
} from "@/utils/locationHelpers";
import { safeLogError } from "@/utils/safeLogger";
import { isLiquidGlassAvailable } from "expo-glass-effect";

// Type definitions for extended EventType fields not in the base type
interface EventTypeExtended {
  lengthInMinutesOptions?: number[];
  disableCancelling?: boolean;
  disableRescheduling?: boolean;
  sendCalVideoTranscription?: boolean;
  autoTranslate?: boolean;
  lockedTimeZone?: string;
  hideCalendarEventDetails?: boolean;
  hideOrganizerEmail?: boolean;
  color?: {
    lightThemeHex?: string;
    darkThemeHex?: string;
  };
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
  const { id, title, description, duration, slug } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    slug?: string;
  }>();

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
  const [isHidden, setIsHidden] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [conferencingOptions, setConferencingOptions] = useState<ConferencingOption[]>([]);
  const [conferencingLoading, setConferencingLoading] = useState(false);
  const [eventTypeData, setEventTypeData] = useState<EventType | null>(null);
  const [saving, setSaving] = useState(false);
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
  const [sendCalVideoTranscription, setSendCalVideoTranscription] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [requiresBookerEmailVerification, setRequiresBookerEmailVerification] = useState(false);
  const [hideCalendarNotes, setHideCalendarNotes] = useState(false);
  const [hideCalendarEventDetails, setHideCalendarEventDetails] = useState(false);
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

      // Set default schedule if one exists
      const defaultSchedule = schedulesData.find((schedule) => schedule.isDefault);
      if (defaultSchedule) {
        setSelectedSchedule(defaultSchedule);
        await fetchScheduleDetails(defaultSchedule.id);
      }
      setSchedulesLoading(false);
    } catch (error) {
      safeLogError("Failed to fetch schedules:", error);
      setSchedulesLoading(false);
    }
  }, [fetchScheduleDetails]);

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

    if (eventTypeExt.disableCancelling !== undefined) {
      setDisableCancelling(eventTypeExt.disableCancelling);
    } else if (metadata?.disableCancelling) {
      setDisableCancelling(true);
    }

    if (eventTypeExt.disableRescheduling !== undefined) {
      setDisableRescheduling(eventTypeExt.disableRescheduling);
    } else if (metadata?.disableRescheduling) {
      setDisableRescheduling(true);
    }

    if (eventTypeExt.sendCalVideoTranscription !== undefined) {
      setSendCalVideoTranscription(eventTypeExt.sendCalVideoTranscription);
    } else if (metadata?.sendCalVideoTranscription) {
      setSendCalVideoTranscription(true);
    }

    if (eventTypeExt.autoTranslate !== undefined) {
      setAutoTranslate(eventTypeExt.autoTranslate);
    } else if (metadata?.autoTranslate) {
      setAutoTranslate(true);
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

    // Load redirect URL
    if (eventType.successRedirectUrl) {
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

      const availability = selectedScheduleDetails.availability?.find((avail) => {
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
      });

      return {
        day,
        available: !!availability,
        startTime: availability?.startTime,
        endTime: availability?.endTime,
      };
    });

    return daySchedule;
  };

  const handlePreview = async () => {
    const eventTypeSlug = eventSlug || "preview";
    let link: string;
    try {
      link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);
    } catch (error) {
      safeLogError("Failed to generate preview link:", error);
      showErrorAlert("Error", "Failed to generate preview link. Please try again.");
      return;
    }
    await openInAppBrowser(link, "event type preview");
  };

  const handleCopyLink = async () => {
    const eventTypeSlug = eventSlug || "event-link";
    let link: string;
    try {
      link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);
    } catch (error) {
      safeLogError("Failed to copy link:", error);
      showErrorAlert("Error", "Failed to copy link. Please try again.");
      return;
    }
    await Clipboard.setStringAsync(link);
    Alert.alert("Success", "Link copied!");
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
            await CalComAPIService.deleteEventType(eventTypeId);

            Alert.alert("Success", "Event type deleted successfully", [
              {
                text: "OK",
                onPress: () => router.back(),
              },
            ]);
          } catch (error) {
            safeLogError("Failed to delete event type:", error);
            showErrorAlert("Error", "Failed to delete event type. Please try again.");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!id) {
      Alert.alert("Error", "Event type ID is missing");
      return;
    }

    // Validate required fields
    if (!eventTitle || !eventSlug) {
      Alert.alert("Error", "Title and slug are required");
      return;
    }

    const durationNum = parseInt(eventDuration, 10);
    if (Number.isNaN(durationNum) || durationNum <= 0) {
      Alert.alert("Error", "Duration must be a positive number");
      return;
    }

    // Validate locations before saving
    if (locations.length > 0) {
      for (const loc of locations) {
        const validation = validateLocationItem(loc);
        if (!validation.valid) {
          Alert.alert("Error", validation.error || "Invalid location");
          return;
        }
      }
    }

    // Detect create vs update mode
    const isCreateMode = id === "new";

    // Extract values with optional chaining outside try/catch for React Compiler
    const selectedScheduleId = selectedSchedule?.id;

    setSaving(true);

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

      // Create new event type
      try {
        await CalComAPIService.createEventType(payload);
      } catch (error) {
        safeLogError("Failed to save event type:", error);
        showErrorAlert("Error", "Failed to create event type. Please try again.");
        setSaving(false);
        return;
      }
      Alert.alert("Success", "Event type created successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
      setSaving(false);
    } else {
      // For UPDATE mode, use partial update - only send changed fields
      const currentFormState = {
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
        selectedScheduleId,

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
        autoTranslate,

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
      };

      // Build partial payload with only changed fields
      const payload = buildPartialUpdatePayload(currentFormState, eventTypeData);

      if (Object.keys(payload).length === 0) {
        Alert.alert("No Changes", "No changes were made to the event type.");
        setSaving(false);
        return;
      }

      try {
        await CalComAPIService.updateEventType(parseInt(id, 10), payload);
      } catch (error) {
        safeLogError("Failed to save event type:", error);
        showErrorAlert("Error", "Failed to update event type. Please try again.");
        setSaving(false);
        return;
      }
      Alert.alert("Success", "Event type updated successfully");
      // Refresh event type data to sync with server
      await fetchEventTypeData();
      setSaving(false);
    }
  };

  const headerTitle = id === "new" ? "Create Event Type" : truncateTitle(title);
  const saveButtonText = id === "new" ? "Create" : "Save";

  const renderHeaderLeft = () => (
    <HeaderButtonWrapper side="left">
      <AppPressable onPress={() => router.back()} className="px-2 py-2">
        <Ionicons name="close" size={24} color="#007AFF" />
      </AppPressable>
    </HeaderButtonWrapper>
  );

  const renderHeaderRight = () => (
    <HeaderButtonWrapper side="right">
      <View className="flex-row items-center" style={{ gap: Platform.OS === "web" ? 24 : 8 }}>
        {/* Tab Navigation Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AppPressable className="flex-row items-center gap-1 px-2 py-2">
              <Text className="text-[16px] font-semibold text-[#007AFF]" numberOfLines={1}>
                {tabs.find((tab) => tab.id === activeTab)?.label ?? "Basics"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color="#007AFF"
                style={{ marginLeft: 2, flexShrink: 0 }}
              />
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
                      color={isSelected ? "#007AFF" : "#666"}
                    />
                    <Text
                      className={
                        isSelected ? "text-base font-semibold text-[#007AFF]" : "text-base"
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
          disabled={saving}
          className={`px-2 py-2 ${saving ? "opacity-50" : ""}`}
        >
          <Text className="text-[16px] font-semibold text-[#007AFF]">{saveButtonText}</Text>
        </AppPressable>
      </View>
    </HeaderButtonWrapper>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackButtonDisplayMode: "minimal",
          headerLeft:
            Platform.OS === "android" || Platform.OS === "web" ? renderHeaderLeft : undefined,
          headerRight:
            Platform.OS === "android" || Platform.OS === "web" ? renderHeaderRight : undefined,
          headerShown: Platform.OS !== "ios",
          headerTransparent: Platform.select({
            ios: true,
          }),
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header blurEffect={isLiquidGlassAvailable() ? undefined : "light"}>
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
              disabled={saving}
              variant="prominent"
              tintColor="#000"
            >
              {saveButtonText}
            </Stack.Header.Button>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <View className="flex-1 bg-[#f8f9fa]">
        <ScrollView
          style={{
            flex: 1,
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
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
              setShowDefaultDurationDropdown={setShowDefaultDurationDropdown}
              // Multiple locations support
              locations={locations}
              onAddLocation={handleAddLocation}
              onRemoveLocation={handleRemoveLocation}
              onUpdateLocation={handleUpdateLocation}
              locationOptions={getLocationOptionsForDropdown()}
              conferencingLoading={conferencingLoading}
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
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowDurationDropdown(false)}
            >
              <View className="max-h-[80%] min-w-[300px] max-w-[90%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  Select Available Durations
                </Text>
                <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
                  {availableDurations.map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      className={`mb-1 flex-row items-center justify-between rounded-lg px-2 py-3 md:px-4 ${
                        selectedDurations.includes(duration) ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => toggleDurationSelection(duration)}
                    >
                      <Text
                        className={`text-base text-[#333] ${
                          selectedDurations.includes(duration) ? "font-semibold" : ""
                        }`}
                      >
                        {duration}
                      </Text>
                      {selectedDurations.includes(duration) ? (
                        <Ionicons name="checkmark" size={20} color="#000" />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  className="items-center rounded-lg bg-black px-6 py-3"
                  onPress={() => setShowDurationDropdown(false)}
                >
                  <Text className="text-base font-semibold text-white">Done</Text>
                </TouchableOpacity>
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
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowDefaultDurationDropdown(false)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  Select Default Duration
                </Text>
                {selectedDurations.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      defaultDuration === duration ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setDefaultDuration(duration);
                      setShowDefaultDurationDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] ${
                        defaultDuration === duration ? "font-semibold" : ""
                      }`}
                    >
                      {duration}
                    </Text>
                    {defaultDuration === duration ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    ) : null}
                  </TouchableOpacity>
                ))}
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
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowScheduleDropdown(false)}
            >
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  Select Schedule
                </Text>
                {schedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.id}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      selectedSchedule?.id === schedule.id ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setSelectedSchedule(schedule);
                      setShowScheduleDropdown(false);
                      fetchScheduleDetails(schedule.id);
                    }}
                  >
                    <View className="flex-1 flex-row items-center justify-between">
                      <Text
                        className={`text-base text-[#333] ${
                          selectedSchedule?.id === schedule.id ? "font-semibold" : ""
                        }`}
                      >
                        {schedule.name}
                      </Text>
                      {schedule.isDefault ? (
                        <Text className="rounded bg-[#E8F5E8] px-1.5 py-0.5 text-xs font-medium text-[#34C759]">
                          Default
                        </Text>
                      ) : null}
                    </View>
                    {selectedSchedule?.id === schedule.id ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    ) : null}
                  </TouchableOpacity>
                ))}
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
                className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5"
                style={{ maxHeight: "70%" }}
              >
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
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
                          ? "bg-[#F0F0F0]"
                          : "active:bg-[#F0F0F0]"
                      }`}
                      onPress={() => {
                        setSelectedTimezone(tz);
                        setShowTimezoneDropdown(false);
                      }}
                    >
                      <Text
                        className={`text-base text-[#333] ${
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
                        <Ionicons name="checkmark" size={20} color="#000" />
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
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  Before event buffer
                </Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      beforeEventBuffer === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setBeforeEventBuffer(option);
                      setShowBeforeBufferDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] ${
                        beforeEventBuffer === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {beforeEventBuffer === option ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
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
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  After event buffer
                </Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      afterEventBuffer === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setAfterEventBuffer(option);
                      setShowAfterBufferDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] ${
                        afterEventBuffer === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {afterEventBuffer === option ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
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
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  Time unit
                </Text>
                {timeUnitOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      minimumNoticeUnit === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setMinimumNoticeUnit(option);
                      setShowMinimumNoticeUnitDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] ${
                        minimumNoticeUnit === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {minimumNoticeUnit === option ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
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
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
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
                        isSelected ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        if (showFrequencyUnitDropdown) {
                          updateFrequencyLimit(showFrequencyUnitDropdown, "unit", option);
                        }
                        setShowFrequencyUnitDropdown(null);
                      }}
                    >
                      <Text
                        className={`text-base text-[#333] ${isSelected ? "font-semibold" : ""}`}
                      >
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#000" />}
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
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
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
                        isSelected ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        if (showDurationUnitDropdown) {
                          updateDurationLimit(showDurationUnitDropdown, "unit", option);
                        }
                        setShowDurationUnitDropdown(null);
                      }}
                    >
                      <Text
                        className={`text-base text-[#333] ${isSelected ? "font-semibold" : ""}`}
                      >
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#000" />}
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
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  Slot interval
                </Text>
                {slotIntervalOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      slotInterval === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setSlotInterval(option);
                      setShowSlotIntervalDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base text-[#333] ${
                        slotInterval === option ? "font-semibold" : ""
                      }`}
                    >
                      {option}
                    </Text>
                    {slotInterval === option ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
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
              <View className="min-w-[250px] max-w-[80%] rounded-2xl bg-white p-5">
                <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                  Repeats every
                </Text>
                {(["weekly", "monthly", "yearly"] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      recurringFrequency === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setRecurringFrequency(option);
                      setShowRecurringFrequencyDropdown(false);
                    }}
                  >
                    <Text
                      className={`text-base capitalize text-[#333] ${
                        recurringFrequency === option ? "font-semibold" : ""
                      }`}
                    >
                      {option === "weekly" ? "week" : option === "monthly" ? "month" : "year"}
                    </Text>
                    {recurringFrequency === option ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
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
            />
          ) : null}

          {activeTab === "limits" ? (
            <LimitsTab
              beforeEventBuffer={beforeEventBuffer}
              setShowBeforeBufferDropdown={setShowBeforeBufferDropdown}
              afterEventBuffer={afterEventBuffer}
              setShowAfterBufferDropdown={setShowAfterBufferDropdown}
              minimumNoticeValue={minimumNoticeValue}
              setMinimumNoticeValue={setMinimumNoticeValue}
              minimumNoticeUnit={minimumNoticeUnit}
              setShowMinimumNoticeUnitDropdown={setShowMinimumNoticeUnitDropdown}
              slotInterval={slotInterval}
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
              autoTranslate={autoTranslate}
              setAutoTranslate={setAutoTranslate}
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
            <View className="rounded-2xl bg-white p-5 shadow-md">
              <Text className="mb-2 text-lg font-semibold text-[#333]">Additional Settings</Text>
              <Text className="mb-5 text-sm leading-5 text-[#666]">
                Manage these settings on the web for full functionality.
              </Text>

              <View className="overflow-hidden rounded-lg border border-[#E5E5EA]">
                {/* Apps */}
                <TouchableOpacity
                  onPress={() => {
                    if (id === "new") {
                      Alert.alert("Info", "Save the event type first to configure this setting.");
                    } else {
                      openInAppBrowser(
                        `https://app.cal.com/event-types/${id}?tabName=apps`,
                        "Apps settings"
                      );
                    }
                  }}
                  className="flex-row items-center justify-between bg-white px-4 py-4 active:bg-[#F8F9FA]"
                  style={{ borderBottomWidth: 1, borderBottomColor: "#E5E5EA" }}
                >
                  <View className="flex-1 flex-row items-center">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6]">
                      <Ionicons name="grid" size={18} color="#333" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-semibold text-[#333]">Apps</Text>
                      <Text className="text-sm text-[#666]">Manage app integrations</Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#C7C7CC" />
                </TouchableOpacity>

                {/* Workflows */}
                <TouchableOpacity
                  onPress={() => {
                    if (id === "new") {
                      Alert.alert("Info", "Save the event type first to configure this setting.");
                    } else {
                      openInAppBrowser(
                        `https://app.cal.com/event-types/${id}?tabName=workflows`,
                        "Workflows settings"
                      );
                    }
                  }}
                  className="flex-row items-center justify-between bg-white px-4 py-4 active:bg-[#F8F9FA]"
                  style={{ borderBottomWidth: 1, borderBottomColor: "#E5E5EA" }}
                >
                  <View className="flex-1 flex-row items-center">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6]">
                      <Ionicons name="flash" size={18} color="#333" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-semibold text-[#333]">Workflows</Text>
                      <Text className="text-sm text-[#666]">Configure automated actions</Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#C7C7CC" />
                </TouchableOpacity>

                {/* Webhooks */}
                <TouchableOpacity
                  onPress={() => {
                    if (id === "new") {
                      Alert.alert("Info", "Save the event type first to configure this setting.");
                    } else {
                      openInAppBrowser(
                        `https://app.cal.com/event-types/${id}?tabName=webhooks`,
                        "Webhooks settings"
                      );
                    }
                  }}
                  className="flex-row items-center justify-between bg-white px-4 py-4 active:bg-[#F8F9FA]"
                >
                  <View className="flex-1 flex-row items-center">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6]">
                      <Ionicons name="code" size={18} color="#333" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-semibold text-[#333]">Webhooks</Text>
                      <Text className="text-sm text-[#666]">Set up event notifications</Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {activeTab === "basics" && (
            <View className="rounded-2xl bg-white p-5 mt-3 gap-3">
              <View className="h-12 flex-row items-center justify-between">
                <Text>Hidden</Text>
                <Switch
                  value={isHidden}
                  onValueChange={setIsHidden}
                  trackColor={{ false: "#E5E5EA", true: "#000" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity
                className="h-12 flex-row items-center justify-between"
                onPress={handlePreview}
              >
                <Text>Preview</Text>
                <Ionicons name="open-outline" size={20} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 flex-row items-center justify-between"
                onPress={handleCopyLink}
              >
                <Text>Copy Link</Text>
                <Ionicons name="link-outline" size={20} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 flex-row items-center justify-between"
                onPress={handleDelete}
              >
                <Text className="text-red-500">Delete</Text>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
// test unused variable
