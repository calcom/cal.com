import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdvancedTab } from "@/components/event-type-detail/tabs/AdvancedTab";
import { AvailabilityTab } from "@/components/event-type-detail/tabs/AvailabilityTab";
import { BasicsTab } from "@/components/event-type-detail/tabs/BasicsTab";
import { LimitsTab } from "@/components/event-type-detail/tabs/LimitsTab";
import { RecurringTab } from "@/components/event-type-detail/tabs/RecurringTab";
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
  "use no memo";
  const router = useRouter();
  const { id, title, description, duration, slug } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    slug?: string;
  }>();

  const insets = useSafeAreaInsets();
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
    try {
      const scheduleDetails = await CalComAPIService.getScheduleById(scheduleId);
      setSelectedScheduleDetails(scheduleDetails);
      if (scheduleDetails?.timeZone) {
        setSelectedTimezone(scheduleDetails.timeZone);
      }
      setScheduleDetailsLoading(false);
    } catch (error) {
      safeLogError("Failed to fetch schedule details:", error);
      setSelectedScheduleDetails(null);
      setScheduleDetailsLoading(false);
    }
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

  const fetchEventTypeData = useCallback(async () => {
    if (!id) return;

    try {
      const eventType = await CalComAPIService.getEventTypeById(parseInt(id, 10));
      if (eventType) {
        setEventTypeData(eventType);

        // Load basic fields
        if (eventType.title) setEventTitle(eventType.title);
        if (eventType.slug) setEventSlug(eventType.slug);
        if (eventType.description) setEventDescription(eventType.description);
        if (eventType.lengthInMinutes) setEventDuration(eventType.lengthInMinutes.toString());
        if (eventType.hidden !== undefined) setIsHidden(eventType.hidden);

        const eventTypeExt = eventType as EventType & EventTypeExtended;
        if (
          eventTypeExt.lengthInMinutesOptions &&
          Array.isArray(eventTypeExt.lengthInMinutesOptions) &&
          eventTypeExt.lengthInMinutesOptions.length > 0
        ) {
          setAllowMultipleDurations(true);
          const durationStrings = eventTypeExt.lengthInMinutesOptions.map(
            (mins: number) => `${mins} mins`
          );
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
        if (eventType.bookingLimitsCount && !("disabled" in eventType.bookingLimitsCount)) {
          setLimitBookingFrequency(true);
          const limits: { id: number; value: string; unit: string }[] = [];
          let idCounter = 1;
          if (eventType.bookingLimitsCount.day) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsCount.day.toString(),
              unit: "Per day",
            });
          }
          if (eventType.bookingLimitsCount.week) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsCount.week.toString(),
              unit: "Per week",
            });
          }
          if (eventType.bookingLimitsCount.month) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsCount.month.toString(),
              unit: "Per month",
            });
          }
          if (eventType.bookingLimitsCount.year) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsCount.year.toString(),
              unit: "Per year",
            });
          }
          if (limits.length > 0) {
            setFrequencyLimits(limits);
          }
        }

        // Load duration limits
        if (eventType.bookingLimitsDuration && !("disabled" in eventType.bookingLimitsDuration)) {
          setLimitTotalDuration(true);
          const limits: { id: number; value: string; unit: string }[] = [];
          let idCounter = 1;
          if (eventType.bookingLimitsDuration.day) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsDuration.day.toString(),
              unit: "Per day",
            });
          }
          if (eventType.bookingLimitsDuration.week) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsDuration.week.toString(),
              unit: "Per week",
            });
          }
          if (eventType.bookingLimitsDuration.month) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsDuration.month.toString(),
              unit: "Per month",
            });
          }
          if (eventType.bookingLimitsDuration.year) {
            limits.push({
              id: idCounter++,
              value: eventType.bookingLimitsDuration.year.toString(),
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
          const bookingLimit =
            eventType.bookerActiveBookingsLimit as BookerActiveBookingsLimitExtended;
          if (!("disabled" in bookingLimit)) {
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

        if (eventType.bookingWindow && !("disabled" in eventType.bookingWindow)) {
          setLimitFutureBookings(true);
          if (eventType.bookingWindow.type === "range") {
            setFutureBookingType("range");
            if (
              Array.isArray(eventType.bookingWindow.value) &&
              eventType.bookingWindow.value.length === 2
            ) {
              setRangeStartDate(eventType.bookingWindow.value[0]);
              setRangeEndDate(eventType.bookingWindow.value[1]);
            }
          } else {
            setFutureBookingType("rolling");
            if (typeof eventType.bookingWindow.value === "number") {
              setRollingDays(eventType.bookingWindow.value.toString());
            }
            setRollingCalendarDays(eventType.bookingWindow.type === "calendarDays");
          }
        }

        if (eventTypeExt.disableCancelling !== undefined) {
          setDisableCancelling(eventTypeExt.disableCancelling);
        } else if (eventType.metadata?.disableCancelling) {
          setDisableCancelling(true);
        }

        if (eventTypeExt.disableRescheduling !== undefined) {
          setDisableRescheduling(eventTypeExt.disableRescheduling);
        } else if (eventType.metadata?.disableRescheduling) {
          setDisableRescheduling(true);
        }

        if (eventTypeExt.sendCalVideoTranscription !== undefined) {
          setSendCalVideoTranscription(eventTypeExt.sendCalVideoTranscription);
        } else if (eventType.metadata?.sendCalVideoTranscription) {
          setSendCalVideoTranscription(true);
        }

        if (eventTypeExt.autoTranslate !== undefined) {
          setAutoTranslate(eventTypeExt.autoTranslate);
        } else if (eventType.metadata?.autoTranslate) {
          setAutoTranslate(true);
        }

        if (eventType.metadata) {
          const calendarEventNameValue = eventType.metadata.calendarEventName;
          if (typeof calendarEventNameValue === "string") {
            setCalendarEventName(calendarEventNameValue);
          }
          const addToCalendarEmailValue = eventType.metadata.addToCalendarEmail;
          if (typeof addToCalendarEmailValue === "string") {
            setAddToCalendarEmail(addToCalendarEmailValue);
          }
        }

        // Load booker layouts
        if (eventType.bookerLayouts) {
          if (
            eventType.bookerLayouts.enabledLayouts &&
            Array.isArray(eventType.bookerLayouts.enabledLayouts)
          ) {
            setSelectedLayouts(eventType.bookerLayouts.enabledLayouts);
          }
          if (eventType.bookerLayouts.defaultLayout) {
            setDefaultLayout(eventType.bookerLayouts.defaultLayout);
          }
        }

        if (eventType.confirmationPolicy) {
          const policy = eventType.confirmationPolicy as ConfirmationPolicyExtended;
          if (!("disabled" in policy) || policy.disabled === false) {
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

        if (eventTypeExt.color) {
          if (eventTypeExt.color.lightThemeHex) {
            setEventTypeColorLight(eventTypeExt.color.lightThemeHex);
          }
          if (eventTypeExt.color.darkThemeHex) {
            setEventTypeColorDark(eventTypeExt.color.darkThemeHex);
          }
        }
        if (eventType.eventTypeColor) {
          if (eventType.eventTypeColor.lightEventTypeColor) {
            setEventTypeColorLight(eventType.eventTypeColor.lightEventTypeColor);
          }
          if (eventType.eventTypeColor.darkEventTypeColor) {
            setEventTypeColorDark(eventType.eventTypeColor.darkEventTypeColor);
          }
        }

        if (eventType.recurrence) {
          const recurrence = eventType.recurrence as RecurrenceExtended;
          if (recurrence.disabled !== true && recurrence.interval && recurrence.frequency) {
            setRecurringEnabled(true);
            setRecurringInterval(recurrence.interval.toString());
            const freq = recurrence.frequency as "weekly" | "monthly" | "yearly";
            if (freq === "weekly" || freq === "monthly" || freq === "yearly") {
              setRecurringFrequency(freq);
            }
            setRecurringOccurrences(recurrence.occurrences?.toString() || "12");
          }
        }

        if (eventType.locations && eventType.locations.length > 0) {
          const mappedLocations = eventType.locations.map((loc: ApiLocation) =>
            mapApiLocationToItem(loc)
          );
          setLocations(mappedLocations);

          const firstLocation = eventType.locations[0];
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
      }
    } catch (error) {
      safeLogError("Failed to fetch event type data:", error);
    }
  }, [id]);

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
    try {
      // Handle different time formats that might come from the API
      let date: Date;

      if (time.includes(":")) {
        // Format like "09:00" or "09:00:00"
        const [hours, minutes] = time.split(":").map(Number);
        date = new Date();
        date.setHours(hours, minutes || 0, 0, 0);
      } else {
        // Other formats
        date = new Date(time);
      }

      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return time; // Return original if parsing fails
    }
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
    try {
      const eventTypeSlug = eventSlug || "preview";
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);
      await openInAppBrowser(link, "event type preview");
    } catch (error) {
      safeLogError("Failed to generate preview link:", error);
      showErrorAlert("Error", "Failed to generate preview link. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    try {
      const eventTypeSlug = eventSlug || "event-link";
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);

      await Clipboard.setStringAsync(link);
      Alert.alert("Success", "Link copied!");
    } catch (error) {
      safeLogError("Failed to copy link:", error);
      showErrorAlert("Error", "Failed to copy link. Please try again.");
    }
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

    setSaving(true);
    try {
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

        if (selectedSchedule) {
          payload.scheduleId = selectedSchedule.id;
        }

        payload.hidden = isHidden;

        // Create new event type
        await CalComAPIService.createEventType(payload);
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

        await CalComAPIService.updateEventType(parseInt(id, 10), payload);
        Alert.alert("Success", "Event type updated successfully");
        // Refresh event type data to sync with server
        await fetchEventTypeData();
        setSaving(false);
      }
    } catch (error) {
      safeLogError("Failed to save event type:", error);
      const action = isCreateMode ? "create" : "update";
      showErrorAlert("Error", `Failed to ${action} event type. Please try again.`);
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-[#f8f9fa]">
        {/* Glass Header */}
        <GlassView
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              paddingHorizontal: Platform.OS === "web" ? 16 : 8,
              paddingBottom: 12,
              paddingTop: insets.top + 8,
            },
          ]}
          glassEffectStyle="clear"
        >
          <View className="min-h-[44px] flex-row items-center justify-between">
            <TouchableOpacity
              className="h-10 w-10 items-start justify-center"
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>

            <Text
              className="mx-2.5 flex-1 text-center text-lg font-semibold text-black"
              numberOfLines={1}
            >
              {id === "new" ? "Create Event Type" : truncateTitle(title)}
            </Text>

            <TouchableOpacity
              className={`min-w-[60px] items-center rounded-[10px] bg-black px-2 py-2 md:px-4 ${
                saving ? "opacity-60" : ""
              }`}
              onPress={handleSave}
              disabled={saving}
            >
              <Text className="text-base font-semibold text-white">
                {id === "new" ? "Create" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </GlassView>

        {/* Tabs */}
        {isLiquidGlassAvailable() ? (
          <GlassView
            glassEffectStyle="regular"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              zIndex: 999,
              paddingTop: insets.top + 70,
              paddingBottom: 12,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  className={`min-w-[90px] items-center rounded-[24px] px-3 py-3 md:px-5 ${
                    activeTab === tab.id ? "bg-[rgba(0,0,0,0.08)]" : ""
                  }`}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name={tab.icon}
                      size={18}
                      color={activeTab === tab.id ? "#007AFF" : "#666"}
                    />
                    <Text
                      className={`text-base font-medium ${
                        activeTab === tab.id ? "font-semibold text-[#007AFF]" : "text-[#666]"
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassView>
        ) : (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              zIndex: 999,
              paddingTop: insets.top + 70,
              paddingBottom: 12,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderBottomWidth: 0.5,
              borderBottomColor: "#C6C6C8",
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  className={`min-w-[90px] items-center rounded-[24px] px-3 py-3 md:px-5 ${
                    activeTab === tab.id ? "bg-[#EEEFF2]" : ""
                  }`}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name={tab.icon}
                      size={18}
                      color={activeTab === tab.id ? "#007AFF" : "#666"}
                    />
                    <Text
                      className={`text-base font-medium ${
                        activeTab === tab.id ? "font-semibold text-[#007AFF]" : "text-[#666]"
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={{
            flex: 1,
            paddingTop: Platform.OS === "web" ? 120 : 180,
            paddingBottom: 250,
          }}
          contentContainerStyle={{ padding: 20, paddingBottom: 200 }}
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
        </ScrollView>

        {/* Bottom Action Bar */}
        <GlassView
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingTop: 16,
            paddingHorizontal: 20,
            backgroundColor: "#f8f9fa",
            borderTopWidth: 0.5,
            borderTopColor: "#E5E5EA",
            paddingBottom: insets.bottom + 12,
          }}
          glassEffectStyle="clear"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-medium text-[#333]">Hidden</Text>
              <Switch
                value={isHidden}
                onValueChange={setIsHidden}
                trackColor={{ false: "#E5E5EA", true: "#000" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center gap-3">
              <GlassView
                className="overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]"
                glassEffectStyle="clear"
              >
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center"
                  onPress={handlePreview}
                >
                  <Ionicons name="open-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView
                className="overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]"
                glassEffectStyle="clear"
              >
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center"
                  onPress={handleCopyLink}
                >
                  <Ionicons name="link-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView
                className="overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]"
                glassEffectStyle="clear"
              >
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center"
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#800020" />
                </TouchableOpacity>
              </GlassView>
            </View>
          </View>
        </GlassView>
      </View>
    </>
  );
}
// test unused variable
