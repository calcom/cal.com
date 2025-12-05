import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Linking,
  Alert,
  Clipboard,
  Animated,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalComAPIService, Schedule, ConferencingOption, EventType } from "../services/calcom";
import { showErrorAlert } from "../utils/alerts";
import { getAppIconUrl } from "../utils/getAppIconUrl";
import {
  defaultLocations,
  getDefaultLocationIconUrl,
  isDefaultLocation,
  DefaultLocationType,
} from "../utils/defaultLocations";
import { SvgImage } from "../components/SvgImage";
import {
  parseBufferTime,
  parseMinimumNotice,
  parseFrequencyUnit,
  parseSlotInterval,
} from "../utils/parsers/event-type-parsers";
import { slugify } from "../utils/slugify";
import { BasicsTab } from "./event-type-detail/tabs/BasicsTab";
import { AvailabilityTab } from "./event-type-detail/tabs/AvailabilityTab";
import { LimitsTab } from "./event-type-detail/tabs/LimitsTab";
import { AdvancedTab } from "./event-type-detail/tabs/AdvancedTab";
import { RecurringTab } from "./event-type-detail/tabs/RecurringTab";
import { formatDuration, truncateTitle, formatAppIdToDisplayName } from "./event-type-detail/utils";

const tabs = [
  { id: "basics", label: "Basics", icon: "link" },
  { id: "availability", label: "Availability", icon: "calendar" },
  { id: "limits", label: "Limits", icon: "time" },
  { id: "advanced", label: "Advanced", icon: "settings" },
  { id: "recurring", label: "Recurring", icon: "refresh" },
  { id: "apps", label: "Apps", icon: "grid" },
  { id: "workflows", label: "Workflows", icon: "flash" },
  { id: "webhooks", label: "Webhooks", icon: "code" },
];

export default function EventTypeDetail() {
  const router = useRouter();
  const { id, title, description, duration, price, currency, slug } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    price?: string;
    currency?: string;
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
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLink, setLocationLink] = useState("");
  const [locationPhone, setLocationPhone] = useState("");
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
  const [limitFutureBookings, setLimitFutureBookings] = useState(false);
  const [futureBookingType, setFutureBookingType] = useState<"rolling" | "range">("rolling");
  const [rollingDays, setRollingDays] = useState("30");
  const [rollingCalendarDays, setRollingCalendarDays] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState("");
  const [rangeEndDate, setRangeEndDate] = useState("");
  const [offsetStartTimes, setOffsetStartTimes] = useState(false);
  const [offsetStartValue, setOffsetStartValue] = useState("0");

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
  const [allowReschedulingPastEvents, setAllowReschedulingPastEvents] = useState(false);
  const [allowBookingThroughRescheduleLink, setAllowBookingThroughRescheduleLink] = useState(false);
  const [customReplyToEmail, setCustomReplyToEmail] = useState("");
  const [eventTypeColorLight, setEventTypeColorLight] = useState("#292929");
  const [eventTypeColorDark, setEventTypeColorDark] = useState("#FAFAFA");

  // Recurring tab state
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("1");
  const [recurringFrequency, setRecurringFrequency] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("weekly");
  const [recurringOccurrences, setRecurringOccurrences] = useState("12");

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

  const displayNameToLocationValue = (
    displayName: string
  ): {
    type: string;
    integration?: string;
    address?: string;
    link?: string;
    phone?: string;
    public?: boolean;
  } | null => {
    // First check if it's a default location
    const defaultLocation = defaultLocations.find((loc) => loc.label === displayName);
    if (defaultLocation) {
      // Map internal location types to API location types
      switch (defaultLocation.type) {
        case "attendeeInPerson":
          return { type: "attendeeAddress" };
        case "inPerson":
          // For organizer address, we need to preserve existing address if available
          // or use empty string (will be filled by organizer later)
          return { type: "address", address: "", public: true };
        case "link":
          // For link meeting, we need to preserve existing link if available
          // or use empty string (will be filled by organizer later)
          return { type: "link", link: "", public: true };
        case "phone":
          return { type: "attendeePhone" };
        case "userPhone":
          // For organizer phone, we need to preserve existing phone if available
          // or use empty string (will be filled by organizer later)
          return { type: "phone", phone: "", public: true };
        case "somewhereElse":
          return { type: "attendeeDefined" };
        default:
          return { type: defaultLocation.type };
      }
    }

    // Otherwise, find matching conferencing option
    const option = conferencingOptions.find(
      (opt) => formatAppIdToDisplayName(opt.appId) === displayName
    );
    if (option) {
      return { type: "integration", integration: option.appId, public: true };
    }

    return null;
  };

  const displayNameToAppId = (displayName: string): string | null => {
    // Legacy function for backward compatibility - only for conferencing apps
    const option = conferencingOptions.find(
      (opt) => formatAppIdToDisplayName(opt.appId) === displayName
    );
    return option ? option.appId : null;
  };

  type LocationOption = { label: string; iconUrl: string | null; value: string };
  type LocationGroup = { category: string; options: LocationOption[] };

  const getLocationOptions = (): LocationGroup[] => {
    // Group conferencing apps under "conferencing" category
    const conferencingAppOptions: LocationOption[] = conferencingOptions.map((option) => {
      const iconUrl = getAppIconUrl(option.type, option.appId);
      return {
        label: formatAppIdToDisplayName(option.appId),
        iconUrl: iconUrl,
        value: `integrations:${option.appId}`,
      };
    });

    // Group default locations by their category
    const defaultLocationOptions: LocationOption[] = defaultLocations.map((location) => ({
      label: location.label,
      iconUrl: location.iconUrl,
      value: location.type,
    }));

    // Group options by category
    const grouped: Record<string, LocationOption[]> = {};

    // Add conferencing apps
    if (conferencingAppOptions.length > 0) {
      grouped["conferencing"] = conferencingAppOptions;
    }

    // Add default locations by category
    defaultLocations.forEach((location) => {
      const category = location.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      const option = defaultLocationOptions.find((opt) => opt.value === location.type);
      if (option) {
        grouped[category].push(option);
      }
    });

    // Convert to array format with category labels
    const categoryLabels: Record<string, string> = {
      conferencing: "Conferencing",
      "in person": "In Person",
      phone: "Phone",
      other: "Other",
    };

    const result: LocationGroup[] = [];
    for (const category in grouped) {
      if (grouped[category].length > 0) {
        result.push({
          category: categoryLabels[category] || category,
          options: grouped[category],
        });
      }
    }

    console.log(
      "Total location groups:",
      result.length,
      result.map((g) => `${g.category}: ${g.options.length}`)
    );
    return result;
  };

  const getSelectedLocationIconUrl = (): string | null => {
    if (!selectedLocation) return null;

    // First, check if it's a default location
    const defaultLocation = defaultLocations.find((loc) => loc.label === selectedLocation);
    if (defaultLocation) {
      return defaultLocation.iconUrl;
    }

    // Try to find in conferencing options
    const option = conferencingOptions.find(
      (opt) => formatAppIdToDisplayName(opt.appId) === selectedLocation
    );
    if (option) {
      return getAppIconUrl(option.type, option.appId);
    }

    // Fallback: Handle Cal Video directly (it might not be in conferencing options as it's a global app)
    // Check if selectedLocation matches Cal Video display names
    const calVideoNames = ["Cal Video", "Cal-Video", "cal-video"];
    if (
      calVideoNames.includes(selectedLocation) ||
      selectedLocation.toLowerCase().includes("cal video")
    ) {
      return getAppIconUrl("daily_video", "cal-video");
    }

    // Fallback: Try to reverse the formatAppIdToDisplayName to get appId
    // Convert "Cal Video" back to "cal-video" and try to get icon
    const reverseAppId = selectedLocation.toLowerCase().replace(/\s+/g, "-");
    const fallbackIconUrl = getAppIconUrl("", reverseAppId);
    if (fallbackIconUrl) {
      return fallbackIconUrl;
    }

    return null;
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

  const fetchSchedules = async () => {
    try {
      setSchedulesLoading(true);
      const schedulesData = await CalComAPIService.getSchedules();
      setSchedules(schedulesData);

      // Set default schedule if one exists
      const defaultSchedule = schedulesData.find((schedule) => schedule.isDefault);
      if (defaultSchedule) {
        setSelectedSchedule(defaultSchedule);
        await fetchScheduleDetails(defaultSchedule.id);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const fetchScheduleDetails = async (scheduleId: number) => {
    try {
      setScheduleDetailsLoading(true);
      console.log("Fetching schedule details for ID:", scheduleId);
      const scheduleDetails = await CalComAPIService.getScheduleById(scheduleId);
      console.log("Raw schedule details response:", scheduleDetails);
      setSelectedScheduleDetails(scheduleDetails);
      if (scheduleDetails.timeZone) {
        setSelectedTimezone(scheduleDetails.timeZone);
      }
    } catch (error) {
      console.error("Failed to fetch schedule details:", error);
      setSelectedScheduleDetails(null);
    } finally {
      setScheduleDetailsLoading(false);
    }
  };

  const fetchConferencingOptions = async () => {
    try {
      setConferencingLoading(true);
      const options = await CalComAPIService.getConferencingOptions();
      console.log("Fetched conferencing options:", JSON.stringify(options, null, 2));
      setConferencingOptions(options);
    } catch (error) {
      console.error("Failed to fetch conferencing options:", error);
    } finally {
      setConferencingLoading(false);
    }
  };

  const fetchEventTypeData = async () => {
    if (!id) return;

    try {
      const eventType = await CalComAPIService.getEventTypeById(parseInt(id));
      if (eventType) {
        setEventTypeData(eventType);

        // Load basic fields
        if (eventType.title) setEventTitle(eventType.title);
        if (eventType.slug) setEventSlug(eventType.slug);
        if (eventType.description) setEventDescription(eventType.description);
        if (eventType.lengthInMinutes) setEventDuration(eventType.lengthInMinutes.toString());
        if (eventType.hidden !== undefined) setIsHidden(eventType.hidden);

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
          const limits = [];
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
          const limits = [];
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

        // Load max active bookings
        if (
          eventType.bookerActiveBookingsLimit &&
          !("disabled" in eventType.bookerActiveBookingsLimit)
        ) {
          setMaxActiveBookingsPerBooker(true);
          setMaxActiveBookingsValue(eventType.bookerActiveBookingsLimit.count.toString());
        }

        // Load booking window (future bookings limit)
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

        // Load Advanced tab fields
        if (eventType.metadata) {
          if (eventType.metadata.calendarEventName) {
            setCalendarEventName(eventType.metadata.calendarEventName);
          }
          if (eventType.metadata.addToCalendarEmail) {
            setAddToCalendarEmail(eventType.metadata.addToCalendarEmail);
          }
          if (eventType.metadata.customReplyToEmail) {
            setCustomReplyToEmail(eventType.metadata.customReplyToEmail);
          }
          if (eventType.metadata.disableCancelling) {
            setDisableCancelling(true);
          }
          if (eventType.metadata.disableRescheduling) {
            setDisableRescheduling(true);
          }
          if (eventType.metadata.sendCalVideoTranscription) {
            setSendCalVideoTranscription(true);
          }
          if (eventType.metadata.autoTranslate) {
            setAutoTranslate(true);
          }
          if (eventType.metadata.hideCalendarEventDetails) {
            setHideCalendarEventDetails(true);
          }
          if (eventType.metadata.hideOrganizerEmail) {
            setHideOrganizerEmail(true);
          }
          if (eventType.metadata.allowReschedulingPastEvents) {
            setAllowReschedulingPastEvents(true);
          }
          if (eventType.metadata.allowBookingThroughRescheduleLink) {
            setAllowBookingThroughRescheduleLink(true);
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

        // Load confirmation settings
        if (eventType.requiresConfirmation !== undefined) {
          setRequiresConfirmation(eventType.requiresConfirmation);
        }

        // Load other boolean fields
        if (eventType.requiresBookerEmailVerification !== undefined) {
          setRequiresBookerEmailVerification(eventType.requiresBookerEmailVerification);
        }
        if (eventType.hideCalendarNotes !== undefined) {
          setHideCalendarNotes(eventType.hideCalendarNotes);
        }
        if (eventType.lockTimeZoneToggleOnBookingPage !== undefined) {
          setLockTimezone(eventType.lockTimeZoneToggleOnBookingPage);
        }

        // Load redirect URL
        if (eventType.successRedirectUrl) {
          setSuccessRedirectUrl(eventType.successRedirectUrl);
          if (eventType.forwardParamsSuccessRedirect !== undefined) {
            setForwardParamsSuccessRedirect(eventType.forwardParamsSuccessRedirect);
          }
        }

        // Load event type colors
        if (eventType.eventTypeColor) {
          if (eventType.eventTypeColor.lightEventTypeColor) {
            setEventTypeColorLight(eventType.eventTypeColor.lightEventTypeColor);
          }
          if (eventType.eventTypeColor.darkEventTypeColor) {
            setEventTypeColorDark(eventType.eventTypeColor.darkEventTypeColor);
          }
        }

        // Load recurring event settings
        if (eventType.recurrence && !("disabled" in eventType.recurrence)) {
          setRecurringEnabled(true);
          setRecurringInterval(eventType.recurrence.interval.toString());
          setRecurringFrequency(eventType.recurrence.frequency);
          setRecurringOccurrences(eventType.recurrence.occurrences.toString());
        }

        // Extract location from event type
        if (eventType.locations && eventType.locations.length > 0) {
          const firstLocation = eventType.locations[0];

          // Handle conferencing apps (with integration field)
          if (firstLocation.integration) {
            // Format the integration name (e.g., "google-meet" -> "Google Meet")
            const formattedLocation = formatAppIdToDisplayName(firstLocation.integration);
            setSelectedLocation(formattedLocation);
          }
          // Handle default locations (with type field)
          else if (firstLocation.type) {
            // Map API location types to internal location types
            // Need to distinguish between organizer and attendee types based on presence of fields
            let internalType = firstLocation.type;

            // Check if it's an organizer type (has address, link, or phone field)
            if (
              firstLocation.type === "address" ||
              (firstLocation.type === "phone" && firstLocation.phone)
            ) {
              // Organizer types
              if (firstLocation.type === "address") {
                internalType = "inPerson"; // Organizer address
              } else if (firstLocation.type === "phone" && firstLocation.phone) {
                internalType = "userPhone"; // Organizer phone
              }
            } else if (firstLocation.type === "link") {
              internalType = "link"; // Link meeting
            } else {
              // Attendee types - map API types to internal types
              const apiToInternalTypeMap: Record<string, string> = {
                attendeeAddress: "attendeeInPerson",
                attendeePhone: "phone",
                attendeeDefined: "somewhereElse",
              };

              if (apiToInternalTypeMap[firstLocation.type]) {
                internalType = apiToInternalTypeMap[firstLocation.type];
              }
            }

            const defaultLocation = defaultLocations.find((loc) => loc.type === internalType);
            if (defaultLocation) {
              setSelectedLocation(defaultLocation.label);

              // Populate location input values if they exist
              if (firstLocation.address) {
                setLocationAddress(firstLocation.address);
              }
              if (firstLocation.link) {
                setLocationLink(firstLocation.link);
              }
              if (firstLocation.phone) {
                setLocationPhone(firstLocation.phone);
              }
            } else {
              // Fallback: try to format the type as display name
              setSelectedLocation(firstLocation.type);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch event type data:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "availability") {
      fetchSchedules();
    }
    if (activeTab === "basics") {
      fetchConferencingOptions();
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch event type data and conferencing options on initial load
    fetchEventTypeData();
    fetchConferencingOptions();
  }, [id]);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const userUsername = await CalComAPIService.getUsername();
        setUsername(userUsername);
      } catch (error) {
        console.error("Failed to fetch username:", error);
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
    } catch (error) {
      return time; // Return original if parsing fails
    }
  };

  const getDaySchedule = () => {
    if (!selectedScheduleDetails) {
      console.log("No selectedScheduleDetails");
      return [];
    }

    console.log("selectedScheduleDetails:", selectedScheduleDetails);
    console.log("availability:", selectedScheduleDetails.availability);

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

      console.log(`${day}: availability found:`, availability);

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

      const supported = await Linking.canOpenURL(link);
      if (supported) {
        await Linking.openURL(link);
      } else {
        showErrorAlert("Error", "Cannot open this URL on your device.");
      }
    } catch (error) {
      console.error("Failed to generate preview link:", error);
      showErrorAlert("Error", "Failed to generate preview link. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    try {
      const eventTypeSlug = eventSlug || "event-link";
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);

      Clipboard.setString(link);
      Alert.alert("Success", "Link copied!");
    } catch (error) {
      console.error("Failed to copy link:", error);
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
          try {
            console.log("Attempting to delete event type with ID:", id);
            const eventTypeId = parseInt(id);

            if (isNaN(eventTypeId)) {
              throw new Error("Invalid event type ID");
            }

            await CalComAPIService.deleteEventType(eventTypeId);
            console.log("Event type deleted successfully");

            Alert.alert("Success", "Event type deleted successfully", [
              {
                text: "OK",
                onPress: () => {
                  console.log("Navigating back after successful deletion");
                  router.back();
                },
              },
            ]);
          } catch (error) {
            console.error("Failed to delete event type:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            showErrorAlert("Error", `Failed to delete event type: ${errorMessage}`);
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

    const durationNum = parseInt(eventDuration);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert("Error", "Duration must be a positive number");
      return;
    }

    try {
      setSaving(true);

      // Build location payload if a location is selected
      let locationsPayload:
        | Array<{
            type: string;
            integration?: string;
            address?: string;
            link?: string;
            phone?: string;
            public?: boolean;
          }>
        | undefined;

      if (selectedLocation) {
        const locationValue = displayNameToLocationValue(selectedLocation);
        if (!locationValue) {
          Alert.alert("Error", "Invalid location selected");
          setSaving(false);
          return;
        }

        // Get existing location data to preserve values (address, link, phone)
        const existingLocation = eventTypeData?.locations?.[0];

        // Build location payload based on type
        const locationPayload: {
          type: string;
          integration?: string;
          address?: string;
          link?: string;
          phone?: string;
          public?: boolean;
        } = {
          type: locationValue.type,
        };

        // Add type-specific fields based on location type
        if (locationValue.type === "integration") {
          locationPayload.integration = locationValue.integration;
          locationPayload.public = locationValue.public ?? true;
        } else if (locationValue.type === "address") {
          locationPayload.address = locationAddress || existingLocation?.address || "";
          locationPayload.public = true;
        } else if (locationValue.type === "link") {
          locationPayload.link = locationLink || existingLocation?.link || "";
          locationPayload.public = true;
        } else if (locationValue.type === "phone") {
          locationPayload.phone = locationPhone || existingLocation?.phone || "";
          locationPayload.public = true;
        }

        locationsPayload = [locationPayload];
      }

      // Build the payload with all fields
      const payload: any = {
        title: eventTitle,
        slug: eventSlug,
        lengthInMinutes: durationNum,
      };

      // Add optional fields if they have values
      if (eventDescription) {
        payload.description = eventDescription;
      }

      if (locationsPayload) {
        payload.locations = locationsPayload;
      }

      if (selectedSchedule) {
        payload.scheduleId = selectedSchedule.id;
      }

      if (isHidden !== undefined) {
        payload.hidden = isHidden;
      }

      // Add buffer times if set
      if (beforeEventBuffer && beforeEventBuffer !== "No buffer time") {
        const bufferMinutes = parseBufferTime(beforeEventBuffer);
        if (bufferMinutes > 0) {
          payload.beforeEventBuffer = bufferMinutes;
        }
      }

      if (afterEventBuffer && afterEventBuffer !== "No buffer time") {
        const bufferMinutes = parseBufferTime(afterEventBuffer);
        if (bufferMinutes > 0) {
          payload.afterEventBuffer = bufferMinutes;
        }
      }

      // Add minimum booking notice
      if (minimumNoticeValue && minimumNoticeUnit) {
        const noticeMinutes = parseMinimumNotice(minimumNoticeValue, minimumNoticeUnit);
        if (noticeMinutes > 0) {
          payload.minimumBookingNotice = noticeMinutes;
        }
      }

      // Add booking limits if enabled
      if (limitBookingFrequency && frequencyLimits.length > 0) {
        const limitsCount: any = {};
        frequencyLimits.forEach((limit) => {
          const unit = parseFrequencyUnit(limit.unit);
          if (unit) {
            limitsCount[unit] = parseInt(limit.value) || 1;
          }
        });
        if (Object.keys(limitsCount).length > 0) {
          payload.bookingLimitsCount = limitsCount;
        }
      }

      if (limitTotalDuration && durationLimits.length > 0) {
        const limitsDuration: any = {};
        durationLimits.forEach((limit) => {
          const unit = parseFrequencyUnit(limit.unit);
          if (unit) {
            limitsDuration[unit] = parseInt(limit.value) || 60;
          }
        });
        if (Object.keys(limitsDuration).length > 0) {
          payload.bookingLimitsDuration = limitsDuration;
        }
      }

      // Add slot interval if not default
      if (slotInterval && slotInterval !== "Default") {
        const intervalMinutes = parseSlotInterval(slotInterval);
        if (intervalMinutes > 0) {
          payload.slotInterval = intervalMinutes;
        }
      }

      // Add other boolean flags
      if (onlyShowFirstAvailableSlot) {
        payload.onlyShowFirstAvailableSlot = true;
      }

      if (maxActiveBookingsPerBooker && maxActiveBookingsValue) {
        const count = parseInt(maxActiveBookingsValue);
        if (count > 0) {
          payload.bookerActiveBookingsLimit = { count };
        }
      }

      // Add booking window (future bookings limit)
      if (limitFutureBookings) {
        if (futureBookingType === "range") {
          payload.bookingWindow = {
            type: "range",
            value: [rangeStartDate, rangeEndDate],
          };
        } else {
          payload.bookingWindow = {
            type: rollingCalendarDays ? "calendarDays" : "businessDays",
            value: parseInt(rollingDays),
            rolling: true,
          };
        }
      } else {
        payload.bookingWindow = { disabled: true };
      }

      // Add Advanced tab fields
      if (calendarEventName) {
        payload.metadata = payload.metadata || {};
        payload.metadata.calendarEventName = calendarEventName;
      }

      if (addToCalendarEmail) {
        payload.metadata = payload.metadata || {};
        payload.metadata.addToCalendarEmail = addToCalendarEmail;
      }

      // Booker layouts
      if (selectedLayouts.length > 0) {
        payload.bookerLayouts = {
          enabledLayouts: selectedLayouts,
          defaultLayout: defaultLayout,
        };
      }

      // Confirmation policy
      payload.requiresConfirmation = requiresConfirmation;

      // Boolean flags - always set the actual boolean value so toggling off works
      payload.metadata = {
        ...(payload.metadata || {}),
        disableCancelling,
        disableRescheduling,
        sendCalVideoTranscription,
        autoTranslate,
        hideCalendarEventDetails,
        hideOrganizerEmail,
        allowReschedulingPastEvents,
        allowBookingThroughRescheduleLink,
      };
      payload.requiresBookerEmailVerification = requiresBookerEmailVerification;
      payload.hideCalendarNotes = hideCalendarNotes;
      payload.lockTimeZoneToggleOnBookingPage = lockTimezone;

      // Redirect URL
      if (successRedirectUrl) {
        payload.successRedirectUrl = successRedirectUrl;
        if (forwardParamsSuccessRedirect) {
          payload.forwardParamsSuccessRedirect = true;
        }
      }

      // Custom reply-to email
      if (customReplyToEmail) {
        payload.metadata = payload.metadata || {};
        payload.metadata.customReplyToEmail = customReplyToEmail;
      }

      // Event type colors
      if (eventTypeColorLight || eventTypeColorDark) {
        payload.eventTypeColor = {
          lightEventTypeColor: eventTypeColorLight,
          darkEventTypeColor: eventTypeColorDark,
        };
      }

      // Recurring event
      if (recurringEnabled) {
        payload.recurrence = {
          interval: parseInt(recurringInterval) || 1,
          occurrences: parseInt(recurringOccurrences) || 12,
          frequency: recurringFrequency,
        };
      } else {
        payload.recurrence = { disabled: true };
      }

      // Detect create vs update mode
      const isCreateMode = id === "new";

      if (isCreateMode) {
        // Create new event type
        const newEventType = await CalComAPIService.createEventType(payload);
        Alert.alert("Success", "Event type created successfully", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        // Update existing event type
        await CalComAPIService.updateEventType(parseInt(id), payload);
        Alert.alert("Success", "Event type updated successfully");
        // Refresh event type data
        await fetchEventTypeData();
      }
    } catch (error) {
      console.error("Failed to save event type:", error);
      const action = id === "new" ? "create" : "update";
      showErrorAlert("Error", `Failed to ${action} event type. Please try again.`);
    } finally {
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
              className={`min-w-[60px] items-center rounded-[10px] bg-black px-2 py-2 md:px-4 ${saving ? "opacity-60" : ""}`}
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
        <View
          className="absolute left-0 right-0 top-0 z-[999] border-b border-[#C6C6C8] bg-white pb-2"
          style={{ paddingTop: insets.top + 70 }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 2 }}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                className={`min-w-[80px] items-center rounded-[20px] px-2 py-2 md:px-4 ${
                  activeTab === tab.id ? "bg-[#EEEFF2]" : ""
                }`}
                onPress={() => setActiveTab(tab.id)}
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={activeTab === tab.id ? "#000" : "#666"}
                  />
                  <Text
                    className={`text-sm font-medium ${activeTab === tab.id ? "font-semibold text-black" : "text-[#666]"}`}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView
          style={{
            flex: 1,
            paddingTop: Platform.OS === "web" ? 120 : 180,
            paddingBottom: 250,
          }}
          contentContainerStyle={{ padding: 20, paddingBottom: 200 }}
        >
          {activeTab === "basics" && (
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
              selectedLocation={selectedLocation}
              setShowLocationDropdown={setShowLocationDropdown}
              conferencingLoading={conferencingLoading}
              getSelectedLocationIconUrl={getSelectedLocationIconUrl}
              locationAddress={locationAddress}
              setLocationAddress={setLocationAddress}
              locationLink={locationLink}
              setLocationLink={setLocationLink}
              locationPhone={locationPhone}
              setLocationPhone={setLocationPhone}
            />
          )}

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
                        className={`text-base text-[#333] ${selectedDurations.includes(duration) ? "font-semibold" : ""}`}
                      >
                        {duration}
                      </Text>
                      {selectedDurations.includes(duration) && (
                        <Ionicons name="checkmark" size={20} color="#000" />
                      )}
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
                      className={`text-base text-[#333] ${defaultDuration === duration ? "font-semibold" : ""}`}
                    >
                      {duration}
                    </Text>
                    {defaultDuration === duration && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
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
                        className={`text-base text-[#333] ${selectedSchedule?.id === schedule.id ? "font-semibold" : ""}`}
                      >
                        {schedule.name}
                      </Text>
                      {schedule.isDefault && (
                        <Text className="rounded bg-[#E8F5E8] px-1.5 py-0.5 text-xs font-medium text-[#34C759]">
                          Default
                        </Text>
                      )}
                    </View>
                    {selectedSchedule?.id === schedule.id && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
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
                        className={`text-base text-[#333] ${selectedTimezone === tz || (selectedScheduleDetails?.timeZone === tz && !selectedTimezone) ? "font-semibold" : ""}`}
                      >
                        {tz}
                      </Text>
                      {(selectedTimezone === tz ||
                        (selectedScheduleDetails?.timeZone === tz && !selectedTimezone)) && (
                        <Ionicons name="checkmark" size={20} color="#000" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Location Dropdown Modal */}
          <Modal
            visible={showLocationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLocationDropdown(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
              onPress={() => setShowLocationDropdown(false)}
            >
              <View
                className="w-[80%] max-w-[350px] rounded-2xl bg-white p-5"
                style={{ maxHeight: "70%" }}
              >
                {conferencingLoading ? (
                  <Text className="py-4 text-center text-base text-[#666]">
                    Loading locations...
                  </Text>
                ) : (
                  (() => {
                    const groups = getLocationOptions();
                    if (groups.length === 0) {
                      return (
                        <Text className="py-4 text-center text-base text-[#8E8E93]">
                          No locations available
                        </Text>
                      );
                    }
                    return (
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        style={{ maxHeight: 400 }}
                        nestedScrollEnabled={true}
                        contentContainerStyle={{ paddingBottom: 10 }}
                      >
                        {groups.map((group) => (
                          <View key={group.category}>
                            {/* Section Header */}
                            <View className="px-2 py-2 md:px-4">
                              <Text className="text-xs font-normal uppercase tracking-wide text-[#666]">
                                {group.category}
                              </Text>
                            </View>
                            {/* Section Options */}
                            {group.options.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                activeOpacity={0.7}
                                className={`flex-row items-center justify-between rounded-lg px-2 py-2.5 md:px-4 ${
                                  selectedLocation === option.label
                                    ? "bg-[#F0F0F0]"
                                    : "active:bg-[#F0F0F0]"
                                }`}
                                style={{ marginBottom: 2 }}
                                onPress={() => {
                                  const newLocation = defaultLocations.find(
                                    (loc) => loc.label === option.label
                                  );
                                  setSelectedLocation(option.label);
                                  setShowLocationDropdown(false);
                                  // Clear input values that are not needed for the new location
                                  if (!newLocation || newLocation.type !== "inPerson") {
                                    setLocationAddress("");
                                  }
                                  if (!newLocation || newLocation.type !== "link") {
                                    setLocationLink("");
                                  }
                                  if (!newLocation || newLocation.type !== "userPhone") {
                                    setLocationPhone("");
                                  }
                                }}
                              >
                                <View className="flex-1 flex-row items-center">
                                  {option.iconUrl ? (
                                    <SvgImage
                                      uri={option.iconUrl}
                                      width={18}
                                      height={18}
                                      style={{ marginRight: 12 }}
                                    />
                                  ) : (
                                    <View
                                      style={{
                                        width: 18,
                                        height: 18,
                                        backgroundColor: "#FF6B6B",
                                        borderRadius: 4,
                                        marginRight: 12,
                                        justifyContent: "center",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Text
                                        style={{ color: "white", fontSize: 8, fontWeight: "bold" }}
                                      >
                                        ?
                                      </Text>
                                    </View>
                                  )}
                                  <Text
                                    className={`text-base text-[#333] ${selectedLocation === option.label ? "font-semibold" : ""}`}
                                  >
                                    {option.label}
                                  </Text>
                                </View>
                                {selectedLocation === option.label && (
                                  <Ionicons name="checkmark" size={20} color="#000" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        ))}
                      </ScrollView>
                    );
                  })()
                )}
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
                      className={`text-base text-[#333] ${beforeEventBuffer === option ? "font-semibold" : ""}`}
                    >
                      {option}
                    </Text>
                    {beforeEventBuffer === option && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
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
                      className={`text-base text-[#333] ${afterEventBuffer === option ? "font-semibold" : ""}`}
                    >
                      {option}
                    </Text>
                    {afterEventBuffer === option && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
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
                      className={`text-base text-[#333] ${minimumNoticeUnit === option ? "font-semibold" : ""}`}
                    >
                      {option}
                    </Text>
                    {minimumNoticeUnit === option && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
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
                      className={`text-base text-[#333] ${slotInterval === option ? "font-semibold" : ""}`}
                    >
                      {option}
                    </Text>
                    {slotInterval === option && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {activeTab === "availability" && (
            <AvailabilityTab
              selectedSchedule={selectedSchedule}
              setShowScheduleDropdown={setShowScheduleDropdown}
              schedulesLoading={schedulesLoading}
              scheduleDetailsLoading={scheduleDetailsLoading}
              selectedScheduleDetails={selectedScheduleDetails}
              getDaySchedule={getDaySchedule}
              formatTime={formatTime}
              selectedTimezone={selectedTimezone}
            />
          )}

          {activeTab === "limits" && (
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
              limitTotalDuration={limitTotalDuration}
              toggleTotalDuration={toggleTotalDuration}
              durationAnimationValue={durationAnimationValue}
              durationLimits={durationLimits}
              updateDurationLimit={updateDurationLimit}
              setShowDurationUnitDropdown={setShowDurationUnitDropdown}
              removeDurationLimit={removeDurationLimit}
              addDurationLimit={addDurationLimit}
              onlyShowFirstAvailableSlot={onlyShowFirstAvailableSlot}
              setOnlyShowFirstAvailableSlot={setOnlyShowFirstAvailableSlot}
              maxActiveBookingsPerBooker={maxActiveBookingsPerBooker}
              setMaxActiveBookingsPerBooker={setMaxActiveBookingsPerBooker}
              maxActiveBookingsValue={maxActiveBookingsValue}
              setMaxActiveBookingsValue={setMaxActiveBookingsValue}
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
          )}

          {activeTab === "advanced" && (
            <AdvancedTab
              calendarEventName={calendarEventName}
              setCalendarEventName={setCalendarEventName}
              addToCalendarEmail={addToCalendarEmail}
              setAddToCalendarEmail={setAddToCalendarEmail}
              selectedLayouts={selectedLayouts}
              setSelectedLayouts={setSelectedLayouts}
              defaultLayout={defaultLayout}
              setDefaultLayout={setDefaultLayout}
              requiresConfirmation={requiresConfirmation}
              setRequiresConfirmation={setRequiresConfirmation}
              disableCancelling={disableCancelling}
              setDisableCancelling={setDisableCancelling}
              disableRescheduling={disableRescheduling}
              setDisableRescheduling={setDisableRescheduling}
              sendCalVideoTranscription={sendCalVideoTranscription}
              setSendCalVideoTranscription={setSendCalVideoTranscription}
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
            />
          )}

          {activeTab === "recurring" && (
            <RecurringTab
              recurringEnabled={recurringEnabled}
              setRecurringEnabled={setRecurringEnabled}
              recurringInterval={recurringInterval}
              setRecurringInterval={setRecurringInterval}
              recurringFrequency={recurringFrequency}
              setRecurringFrequency={setRecurringFrequency}
              recurringOccurrences={recurringOccurrences}
              setRecurringOccurrences={setRecurringOccurrences}
            />
          )}

          {activeTab === "apps" && (
            <View className="rounded-2xl bg-white p-5 shadow-md">
              <Text className="mb-4 text-lg font-semibold text-[#333]">Connected Apps</Text>
              <Text className="mb-6 text-base leading-6 text-[#666]">
                Manage app integrations for this event type.
              </Text>
            </View>
          )}

          {activeTab === "workflows" && (
            <View className="rounded-2xl bg-white p-5 shadow-md">
              <Text className="mb-4 text-lg font-semibold text-[#333]">Workflows</Text>
              <Text className="mb-6 text-base leading-6 text-[#666]">
                Configure automated workflows and actions.
              </Text>
            </View>
          )}

          {activeTab === "webhooks" && (
            <View className="rounded-2xl bg-white p-5 shadow-md">
              <Text className="mb-4 text-lg font-semibold text-[#333]">Webhooks</Text>
              <Text className="mb-6 text-base leading-6 text-[#666]">
                Set up webhook endpoints for event notifications.
              </Text>
            </View>
          )}
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
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </GlassView>
            </View>
          </View>
        </GlassView>
      </View>
    </>
  );
}
