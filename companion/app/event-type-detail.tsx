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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalComAPIService, Schedule, ConferencingOption, EventType } from "../services/calcom";
import { getAppIconUrl } from "../utils/getAppIconUrl";
import { defaultLocations, getDefaultLocationIconUrl, isDefaultLocation, DefaultLocationType } from "../utils/defaultLocations";
import { SvgImage } from "../components/SvgImage";
import {
  parseBufferTime,
  parseMinimumNotice,
  parseFrequencyUnit,
  parseSlotInterval,
} from "../utils/parsers/event-type-parsers";
import { slugify } from "../utils/slugify";

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
  const [recurringFrequency, setRecurringFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
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

  const formatDuration = (minutes: string) => {
    const mins = parseInt(minutes) || 0;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const truncateTitle = (text: string, maxLength: number = 20) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const formatAppIdToDisplayName = (appId: string): string => {
    // Convert appId like "google-meet" to "Google Meet"
    return appId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const displayNameToLocationValue = (displayName: string): {
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
    const option = conferencingOptions.find((opt) => formatAppIdToDisplayName(opt.appId) === displayName);
    if (option) {
      return { type: "integration", integration: option.appId, public: true };
    }
    
    return null;
  };

  const displayNameToAppId = (displayName: string): string | null => {
    // Legacy function for backward compatibility - only for conferencing apps
    const option = conferencingOptions.find((opt) => formatAppIdToDisplayName(opt.appId) === displayName);
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
      "conferencing": "Conferencing",
      "in person": "In Person",
      "phone": "Phone",
      "other": "Other",
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

    console.log('Total location groups:', result.length, result.map(g => `${g.category}: ${g.options.length}`));
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
    const option = conferencingOptions.find((opt) => formatAppIdToDisplayName(opt.appId) === selectedLocation);
    if (option) {
      return getAppIconUrl(option.type, option.appId);
    }
    
    // Fallback: Handle Cal Video directly (it might not be in conferencing options as it's a global app)
    // Check if selectedLocation matches Cal Video display names
    const calVideoNames = ["Cal Video", "Cal-Video", "cal-video"];
    if (calVideoNames.includes(selectedLocation) || selectedLocation.toLowerCase().includes("cal video")) {
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
        if (eventType.bookingLimitsCount && !('disabled' in eventType.bookingLimitsCount)) {
          setLimitBookingFrequency(true);
          const limits = [];
          let idCounter = 1;
          if (eventType.bookingLimitsCount.day) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsCount.day.toString(), unit: "Per day" });
          }
          if (eventType.bookingLimitsCount.week) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsCount.week.toString(), unit: "Per week" });
          }
          if (eventType.bookingLimitsCount.month) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsCount.month.toString(), unit: "Per month" });
          }
          if (eventType.bookingLimitsCount.year) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsCount.year.toString(), unit: "Per year" });
          }
          if (limits.length > 0) {
            setFrequencyLimits(limits);
          }
        }

        // Load duration limits
        if (eventType.bookingLimitsDuration && !('disabled' in eventType.bookingLimitsDuration)) {
          setLimitTotalDuration(true);
          const limits = [];
          let idCounter = 1;
          if (eventType.bookingLimitsDuration.day) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsDuration.day.toString(), unit: "Per day" });
          }
          if (eventType.bookingLimitsDuration.week) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsDuration.week.toString(), unit: "Per week" });
          }
          if (eventType.bookingLimitsDuration.month) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsDuration.month.toString(), unit: "Per month" });
          }
          if (eventType.bookingLimitsDuration.year) {
            limits.push({ id: idCounter++, value: eventType.bookingLimitsDuration.year.toString(), unit: "Per year" });
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
        if (eventType.bookerActiveBookingsLimit && !('disabled' in eventType.bookerActiveBookingsLimit)) {
          setMaxActiveBookingsPerBooker(true);
          setMaxActiveBookingsValue(eventType.bookerActiveBookingsLimit.count.toString());
        }

        // Load booking window (future bookings limit)
        if (eventType.bookingWindow && !('disabled' in eventType.bookingWindow)) {
          setLimitFutureBookings(true);
          if (eventType.bookingWindow.type === 'range') {
            setFutureBookingType('range');
            if (Array.isArray(eventType.bookingWindow.value) && eventType.bookingWindow.value.length === 2) {
              setRangeStartDate(eventType.bookingWindow.value[0]);
              setRangeEndDate(eventType.bookingWindow.value[1]);
            }
          } else {
            setFutureBookingType('rolling');
            if (typeof eventType.bookingWindow.value === 'number') {
              setRollingDays(eventType.bookingWindow.value.toString());
            }
            setRollingCalendarDays(eventType.bookingWindow.type === 'calendarDays');
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
          if (eventType.bookerLayouts.enabledLayouts && Array.isArray(eventType.bookerLayouts.enabledLayouts)) {
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
        if (eventType.recurrence && !('disabled' in eventType.recurrence)) {
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
            if (firstLocation.type === "address" || (firstLocation.type === "phone" && firstLocation.phone)) {
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
                "attendeeAddress": "attendeeInPerson",
                "attendeePhone": "phone",
                "attendeeDefined": "somewhereElse",
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

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
        Alert.alert("Error", "Cannot open this URL on your device.");
      }
    } catch (error) {
      console.error("Failed to generate preview link:", error);
      Alert.alert("Error", "Failed to generate preview link. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    try {
      const eventTypeSlug = eventSlug || "event-link";
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);

      Clipboard.setString(link);
      Alert.alert("Success", "Link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      Alert.alert("Error", "Failed to copy link. Please try again.");
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
            Alert.alert("Error", `Failed to delete event type: ${errorMessage}`);
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
      let locationsPayload: Array<{
          type: string;
          integration?: string;
          address?: string;
          link?: string;
        phone?: string;
        public?: boolean;
      }> | undefined;

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
        frequencyLimits.forEach(limit => {
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
        durationLimits.forEach(limit => {
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
        if (futureBookingType === 'range') {
          payload.bookingWindow = {
            type: 'range',
            value: [rangeStartDate, rangeEndDate],
          };
        } else {
          payload.bookingWindow = {
            type: rollingCalendarDays ? 'calendarDays' : 'businessDays',
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
      if (requiresConfirmation) {
        payload.requiresConfirmation = true;
      }

      // Boolean flags
      if (disableCancelling) payload.metadata = { ...payload.metadata, disableCancelling: true };
      if (disableRescheduling) payload.metadata = { ...payload.metadata, disableRescheduling: true };
      if (sendCalVideoTranscription) payload.metadata = { ...payload.metadata, sendCalVideoTranscription: true };
      if (autoTranslate) payload.metadata = { ...payload.metadata, autoTranslate: true };
      if (requiresBookerEmailVerification) payload.requiresBookerEmailVerification = true;
      if (hideCalendarNotes) payload.hideCalendarNotes = true;
      if (hideCalendarEventDetails) payload.metadata = { ...payload.metadata, hideCalendarEventDetails: true };
      if (hideOrganizerEmail) payload.metadata = { ...payload.metadata, hideOrganizerEmail: true };
      if (lockTimezone) payload.lockTimeZoneToggleOnBookingPage = true;
      if (allowReschedulingPastEvents) payload.metadata = { ...payload.metadata, allowReschedulingPastEvents: true };
      if (allowBookingThroughRescheduleLink) payload.metadata = { ...payload.metadata, allowBookingThroughRescheduleLink: true };

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
      Alert.alert("Error", `Failed to ${action} event type. Please try again.`);
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
              paddingHorizontal: 20,
              paddingBottom: 12,
              paddingTop: insets.top + 8,
            },
          ]}
          glassEffectStyle="clear">
          <View className="flex-row items-center justify-between min-h-[44px]">
            <TouchableOpacity className="w-10 h-10 justify-center items-start" onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>

            <Text className="flex-1 text-lg font-semibold text-black text-center mx-2.5" numberOfLines={1}>
              {id === "new" ? "Create Event Type" : truncateTitle(title)}
            </Text>

            <TouchableOpacity
              className={`px-4 py-2 bg-black rounded-[10px] min-w-[60px] items-center ${saving ? "opacity-60" : ""}`}
              onPress={handleSave}
              disabled={saving}>
              <Text className="text-white text-base font-semibold">
                {id === "new" ? "Create" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </GlassView>

        {/* Tabs */}
        <View
          className="absolute top-0 left-0 right-0 z-[999] bg-white border-b border-[#C6C6C8] pb-2"
          style={{ paddingTop: insets.top + 70 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 2 }}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                className={`px-4 py-2 rounded-[20px] min-w-[80px] items-center ${
                  activeTab === tab.id ? "bg-[#EEEFF2]" : ""
                }`}
                onPress={() => setActiveTab(tab.id)}>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? "#000" : "#666"} />
                  <Text
                    className={`text-sm font-medium ${activeTab === tab.id ? "text-black font-semibold" : "text-[#666]"}`}>
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1, paddingTop: 180, paddingBottom: 250 }} contentContainerStyle={{ padding: 20, paddingBottom: 200 }}>
          {activeTab === "basics" && (
            <View className="gap-3">
              {/* Title and Description Card */}
              <View className="bg-white rounded-2xl p-5">
                <View className="mb-3">
                  <Text className="text-base font-semibold text-[#333] mb-1.5">Title</Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    placeholder="Enter event title"
                    placeholderTextColor="#8E8E93"
                  />
                </View>

                <View className="mb-3">
                  <Text className="text-base font-semibold text-[#333] mb-1.5">Description</Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                    style={{ height: 100, textAlignVertical: "top" }}
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    placeholder="Enter event description"
                    placeholderTextColor="#8E8E93"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View className="mb-3">
                  <Text className="text-base font-semibold text-[#333] mb-1.5">URL</Text>
                  <View className="flex-row items-center bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg overflow-hidden">
                    <Text className="bg-[#E5E5EA] text-[#666] text-base px-3 py-3 rounded-tl-lg rounded-bl-lg">cal.com/{username}/</Text>
                    <TextInput
                      className="flex-1 px-3 py-3 text-base text-black"
                      value={eventSlug}
                      onChangeText={(text) => setEventSlug(slugify(text, true))}
                      placeholder="event-slug"
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                </View>
              </View>

              {/* Duration Card */}
              <View className="bg-white rounded-2xl p-5">
                {!allowMultipleDurations && (
                  <View className="mb-3">
                    <Text className="text-base font-semibold text-[#333] mb-1.5">Duration</Text>
                    <View className="flex-row items-center gap-3">
                      <TextInput
                        className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                        value={eventDuration}
                        onChangeText={setEventDuration}
                        placeholder="30"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                      />
                      <Text className="text-base text-[#666]">Minutes</Text>
                    </View>
                  </View>
                )}

                {allowMultipleDurations && (
                  <>
                    <View className="mb-3">
                      <Text className="text-base font-semibold text-[#333] mb-1.5">Available durations</Text>
                      <TouchableOpacity
                        className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                        onPress={() => setShowDurationDropdown(true)}>
                        <Text className="text-base text-black">
                          {selectedDurations.length > 0
                            ? `${selectedDurations.length} duration${
                                selectedDurations.length > 1 ? "s" : ""
                              } selected`
                            : "Select durations"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>

                    {selectedDurations.length > 0 && (
                      <View className="mb-3">
                        <Text className="text-base font-semibold text-[#333] mb-1.5">Default duration</Text>
                        <TouchableOpacity
                          className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                          onPress={() => setShowDefaultDurationDropdown(true)}>
                          <Text className="text-base text-black">
                            {defaultDuration || "Select default duration"}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                <View className="flex-row justify-between items-start">
                  <Text className="text-base text-[#333] font-medium mb-1">Allow multiple durations</Text>
                  <Switch
                    value={allowMultipleDurations}
                    onValueChange={setAllowMultipleDurations}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Location Card */}
              <View className="bg-white rounded-2xl p-5">
                <View className="mb-3">
                  <Text className="text-base font-semibold text-[#333] mb-1.5">Location</Text>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                    onPress={() => setShowLocationDropdown(true)}
                    disabled={conferencingLoading}>
                    <View className="flex-row items-center flex-1">
                      {!conferencingLoading && selectedLocation && getSelectedLocationIconUrl() && (
                        <SvgImage
                          uri={getSelectedLocationIconUrl()!}
                          width={20}
                          height={20}
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <Text className="text-base text-black">
                        {conferencingLoading ? "Loading locations..." : selectedLocation || "Select location"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                  
                  {/* Location Input Fields - shown conditionally based on selected location type */}
                  {(() => {
                    const currentLocation = defaultLocations.find((loc) => loc.label === selectedLocation);
                    if (!currentLocation || !currentLocation.organizerInputType) {
                      return null;
                    }

                    if (currentLocation.organizerInputType === "text") {
                      // Text input for address or link
                      const isAddress = currentLocation.type === "inPerson";
                      const isLink = currentLocation.type === "link";
                      
                      return (
                        <View className="mt-3">
                          <Text className="text-sm font-medium text-[#333] mb-1.5">
                            {currentLocation.organizerInputLabel || (isAddress ? "Address" : "Meeting Link")}
                          </Text>
                          <TextInput
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-4 py-3 text-base text-[#333]"
                            placeholder={currentLocation.organizerInputPlaceholder || ""}
                            value={isAddress ? locationAddress : locationLink}
                            onChangeText={(text) => {
                              if (isAddress) {
                                setLocationAddress(text);
                              } else {
                                setLocationLink(text);
                              }
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType={isLink ? "url" : "default"}
                          />
                          {currentLocation.messageForOrganizer && (
                            <Text className="text-xs text-[#666] mt-2">
                              {currentLocation.messageForOrganizer}
                            </Text>
                          )}
                        </View>
                      );
                    } else if (currentLocation.organizerInputType === "phone") {
                      // Phone input
                      return (
                        <View className="mt-3">
                          <Text className="text-sm font-medium text-[#333] mb-1.5">
                            {currentLocation.organizerInputLabel || "Phone Number"}
                          </Text>
                          <TextInput
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-4 py-3 text-base text-[#333]"
                            placeholder={currentLocation.organizerInputPlaceholder || "Enter phone number"}
                            value={locationPhone}
                            onChangeText={setLocationPhone}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="phone-pad"
                          />
                          {currentLocation.messageForOrganizer && (
                            <Text className="text-xs text-[#666] mt-2">
                              {currentLocation.messageForOrganizer}
                            </Text>
                          )}
                        </View>
                      );
                    }
                    return null;
                  })()}
                </View>
              </View>
            </View>
          )}

          {/* Duration Multi-Select Modal */}
          <Modal
            visible={showDurationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDurationDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowDurationDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[300px] max-w-[90%] max-h-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Available Durations</Text>
                <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
                  {availableDurations.map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        selectedDurations.includes(duration) ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => toggleDurationSelection(duration)}>
                      <Text className={`text-base text-[#333] ${selectedDurations.includes(duration) ? "font-semibold" : ""}`}>
                        {duration}
                      </Text>
                      {selectedDurations.includes(duration) && (
                        <Ionicons name="checkmark" size={20} color="#000" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity className="bg-black py-3 px-6 rounded-lg items-center" onPress={() => setShowDurationDropdown(false)}>
                  <Text className="text-white text-base font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Default Duration Dropdown Modal */}
          <Modal
            visible={showDefaultDurationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDefaultDurationDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowDefaultDurationDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Default Duration</Text>
                {selectedDurations.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      defaultDuration === duration ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setDefaultDuration(duration);
                      setShowDefaultDurationDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${defaultDuration === duration ? "font-semibold" : ""}`}>
                      {duration}
                    </Text>
                    {defaultDuration === duration && <Ionicons name="checkmark" size={20} color="#000" />}
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
            onRequestClose={() => setShowScheduleDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowScheduleDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Schedule</Text>
                {schedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.id}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      selectedSchedule?.id === schedule.id ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setSelectedSchedule(schedule);
                      setShowScheduleDropdown(false);
                      fetchScheduleDetails(schedule.id);
                    }}>
                    <View className="flex-1 flex-row items-center justify-between">
                      <Text className={`text-base text-[#333] ${selectedSchedule?.id === schedule.id ? "font-semibold" : ""}`}>
                        {schedule.name}
                      </Text>
                      {schedule.isDefault && (
                        <Text className="text-xs text-[#34C759] font-medium bg-[#E8F5E8] px-1.5 py-0.5 rounded">
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
            onRequestClose={() => setShowTimezoneDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowTimezoneDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]" style={{ maxHeight: '70%' }}>
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Timezone</Text>
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
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        selectedTimezone === tz || (selectedScheduleDetails?.timeZone === tz && !selectedTimezone) ? "bg-[#F0F0F0]" : "active:bg-[#F0F0F0]"
                      }`}
                      onPress={() => {
                        setSelectedTimezone(tz);
                        setShowTimezoneDropdown(false);
                      }}>
                      <Text className={`text-base text-[#333] ${selectedTimezone === tz || (selectedScheduleDetails?.timeZone === tz && !selectedTimezone) ? "font-semibold" : ""}`}>
                        {tz}
                      </Text>
                      {(selectedTimezone === tz || (selectedScheduleDetails?.timeZone === tz && !selectedTimezone)) && <Ionicons name="checkmark" size={20} color="#000" />}
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
            onRequestClose={() => setShowLocationDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowLocationDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 w-[80%] max-w-[350px]" style={{ maxHeight: '70%' }}>
                {conferencingLoading ? (
                  <Text className="text-base text-[#666] text-center py-4">Loading locations...</Text>
                ) : (() => {
                  const groups = getLocationOptions();
                  if (groups.length === 0) {
                    return <Text className="text-base text-[#8E8E93] text-center py-4">No locations available</Text>;
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
                          <View className="px-4 py-2">
                            <Text className="text-xs font-normal text-[#666] uppercase tracking-wide">
                              {group.category}
                            </Text>
                          </View>
                          {/* Section Options */}
                          {group.options.map((option) => (
                            <TouchableOpacity
                              key={option.value}
                              activeOpacity={0.7}
                              className={`flex-row justify-between items-center py-2.5 px-4 rounded-lg ${
                                selectedLocation === option.label ? "bg-[#F0F0F0]" : "active:bg-[#F0F0F0]"
                              }`}
                              style={{ marginBottom: 2 }}
                              onPress={() => {
                                const newLocation = defaultLocations.find((loc) => loc.label === option.label);
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
                              }}>
                              <View className="flex-row items-center flex-1">
                                {option.iconUrl ? (
                                  <SvgImage
                                    uri={option.iconUrl}
                                    width={18}
                                    height={18}
                                    style={{ marginRight: 12 }}
                                  />
                                ) : (
                                  <View style={{ width: 18, height: 18, backgroundColor: '#FF6B6B', borderRadius: 4, marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>?</Text>
                                  </View>
                                )}
                                <Text className={`text-base text-[#333] ${selectedLocation === option.label ? "font-semibold" : ""}`}>
                                  {option.label}
                                </Text>
                              </View>
                              {selectedLocation === option.label && <Ionicons name="checkmark" size={20} color="#000" />}
                            </TouchableOpacity>
                          ))}
                        </View>
                      ))}
                    </ScrollView>
                  );
                })()}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Before Event Buffer Dropdown Modal */}
          <Modal
            visible={showBeforeBufferDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBeforeBufferDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowBeforeBufferDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Before event buffer</Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      beforeEventBuffer === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setBeforeEventBuffer(option);
                      setShowBeforeBufferDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${beforeEventBuffer === option ? "font-semibold" : ""}`}>
                      {option}
                    </Text>
                    {beforeEventBuffer === option && <Ionicons name="checkmark" size={20} color="#000" />}
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
            onRequestClose={() => setShowAfterBufferDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowAfterBufferDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">After event buffer</Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      afterEventBuffer === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setAfterEventBuffer(option);
                      setShowAfterBufferDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${afterEventBuffer === option ? "font-semibold" : ""}`}>
                      {option}
                    </Text>
                    {afterEventBuffer === option && <Ionicons name="checkmark" size={20} color="#000" />}
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
            onRequestClose={() => setShowMinimumNoticeUnitDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowMinimumNoticeUnitDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Time unit</Text>
                {timeUnitOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      minimumNoticeUnit === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setMinimumNoticeUnit(option);
                      setShowMinimumNoticeUnitDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${minimumNoticeUnit === option ? "font-semibold" : ""}`}>
                      {option}
                    </Text>
                    {minimumNoticeUnit === option && <Ionicons name="checkmark" size={20} color="#000" />}
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
            onRequestClose={() => setShowFrequencyUnitDropdown(null)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowFrequencyUnitDropdown(null)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Frequency unit</Text>
                {frequencyUnitOptions.map((option) => {
                  const selectedLimit = frequencyLimits.find(
                    (limit) => limit.id === showFrequencyUnitDropdown
                  );
                  const isSelected = selectedLimit?.unit === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        isSelected ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        if (showFrequencyUnitDropdown) {
                          updateFrequencyLimit(showFrequencyUnitDropdown, "unit", option);
                        }
                        setShowFrequencyUnitDropdown(null);
                      }}>
                      <Text className={`text-base text-[#333] ${isSelected ? "font-semibold" : ""}`}>
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
            onRequestClose={() => setShowDurationUnitDropdown(null)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowDurationUnitDropdown(null)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Duration unit</Text>
                {durationUnitOptions.map((option) => {
                  const selectedLimit = durationLimits.find((limit) => limit.id === showDurationUnitDropdown);
                  const isSelected = selectedLimit?.unit === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        isSelected ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        if (showDurationUnitDropdown) {
                          updateDurationLimit(showDurationUnitDropdown, "unit", option);
                        }
                        setShowDurationUnitDropdown(null);
                      }}>
                      <Text className={`text-base text-[#333] ${isSelected ? "font-semibold" : ""}`}>
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
            onRequestClose={() => setShowSlotIntervalDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowSlotIntervalDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Slot interval</Text>
                {slotIntervalOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      slotInterval === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setSlotInterval(option);
                      setShowSlotIntervalDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${slotInterval === option ? "font-semibold" : ""}`}>
                      {option}
                    </Text>
                    {slotInterval === option && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {activeTab === "availability" && (
            <View className="bg-white rounded-2xl p-5">
              <View className="mb-3">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Availability</Text>
                <TouchableOpacity
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                  onPress={() => setShowScheduleDropdown(true)}
                  disabled={schedulesLoading}>
                  <Text className="text-base text-black">
                    {schedulesLoading
                      ? "Loading schedules..."
                      : selectedSchedule
                      ? selectedSchedule.name
                      : "Select schedule"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {selectedSchedule && (
                <>
                  <View className="pt-5 mt-5" style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
                    {scheduleDetailsLoading ? (
                      <View className="py-4 items-center">
                        <Text className="text-sm text-[#8E8E93] italic">Loading schedule details...</Text>
                      </View>
                    ) : selectedScheduleDetails ? (
                      getDaySchedule().map((dayInfo, index) => (
                        <View key={index} className="flex-row justify-between items-center py-4">
                          <Text
                            className={`text-[15px] font-medium text-[#333] flex-1 ml-2 ${
                              !dayInfo.available ? "line-through text-[#8E8E93]" : ""
                            }`}>
                            {dayInfo.day}
                          </Text>
                          <Text className="text-[15px] text-[#666] text-right mr-4">
                            {dayInfo.available && dayInfo.startTime && dayInfo.endTime
                              ? `${formatTime(dayInfo.startTime)} - ${formatTime(dayInfo.endTime)}`
                              : "Unavailable"}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View className="py-4 items-center">
                        <Text className="text-sm text-[#8E8E93] italic">Failed to load schedule details</Text>
                      </View>
                    )}
                  </View>

                  <View className="pt-5 mt-5" style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
                    <Text className="text-base font-semibold text-[#333] mb-1.5">Timezone</Text>
                    <View className="bg-[#F8F9FA] rounded-lg px-3 py-3 items-center">
                      <Text className="text-base text-[#666] text-center">
                        {selectedTimezone || selectedScheduleDetails?.timeZone || "No timezone"}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === "limits" && (
            <View className="gap-3">
              {/* Buffer Time, Minimum Notice, and Slot Interval Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="mb-3">
                  <Text className="text-base font-semibold text-[#333] mb-1.5">Before event</Text>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                    onPress={() => setShowBeforeBufferDropdown(true)}>
                    <Text className="text-base text-black">{beforeEventBuffer}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <View className="mb-3" style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 12, marginTop: 12 }}>
                  <Text className="text-base font-semibold text-[#333] mb-1.5">After event</Text>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                    onPress={() => setShowAfterBufferDropdown(true)}>
                    <Text className="text-base text-black">{afterEventBuffer}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <View className="mb-3" style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 12, marginTop: 12 }}>
                  <Text className="text-base font-semibold text-[#333] mb-1.5">Minimum Notice</Text>
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                      value={minimumNoticeValue}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9]/g, "");
                        const num = parseInt(numericValue) || 0;
                        if (num >= 0) {
                          setMinimumNoticeValue(numericValue || "0");
                        }
                      }}
                      placeholder="1"
                      placeholderTextColor="#8E8E93"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                      onPress={() => setShowMinimumNoticeUnitDropdown(true)}>
                      <Text className="text-base text-black">{minimumNoticeUnit}</Text>
                      <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 12, marginTop: 12 }}>
                  <Text className="text-base font-semibold text-[#333] mb-1.5">Time-slot intervals</Text>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                    onPress={() => setShowSlotIntervalDropdown(true)}>
                    <Text className="text-base text-black">{slotInterval === "Default" ? "Use event length (default)" : slotInterval}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Booking Frequency Limit Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-4">
                    <Text className="text-base text-[#333] font-medium mb-1">Limit booking frequency</Text>
                    <Text className="text-sm text-[#666] leading-5">
                      Limit how many times this event can be booked.
                    </Text>
                  </View>
                  <Switch
                    value={limitBookingFrequency}
                    onValueChange={toggleBookingFrequency}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <Animated.View
                  style={[
                    { overflow: "hidden" },
                    {
                      opacity: frequencyAnimationValue,
                      maxHeight: frequencyAnimationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 500],
                      }),
                    },
                  ]}>
                  {limitBookingFrequency && (
                    <>
                      {frequencyLimits.map((limit, index) => (
                        <View key={limit.id} className="flex-row items-center mt-4 gap-3">
                          <TextInput
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                            value={limit.value}
                            onChangeText={(text) => {
                              const numericValue = text.replace(/[^0-9]/g, "");
                              const num = parseInt(numericValue) || 0;
                              if (num >= 0) {
                                updateFrequencyLimit(limit.id, "value", numericValue || "0");
                              }
                            }}
                            placeholder="1"
                            placeholderTextColor="#8E8E93"
                            keyboardType="numeric"
                          />
                          <TouchableOpacity
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                            onPress={() => setShowFrequencyUnitDropdown(limit.id)}>
                            <Text className="text-base text-black">{limit.unit}</Text>
                            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                          </TouchableOpacity>
                          {frequencyLimits.length > 1 && (
                            <TouchableOpacity
                              className="w-10 h-10 justify-center items-center bg-[#FFF1F0] rounded-lg border border-[#FFCCC7]"
                              onPress={() => removeFrequencyLimit(limit.id)}>
                              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        className="flex-row items-center justify-center mt-4 py-3 px-4 bg-transparent border border-black rounded-lg gap-2"
                        onPress={addFrequencyLimit}>
                        <Ionicons name="add" size={20} color="#000" />
                        <Text className="text-base text-black font-medium">Add Limit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </Animated.View>
              </View>

              {/* Total Booking Duration Limit Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-4">
                    <Text className="text-base text-[#333] font-medium mb-1">Limit total booking duration</Text>
                    <Text className="text-sm text-[#666] leading-5">
                      Limit total amount of time that this event can be booked.
                    </Text>
                  </View>
                  <Switch
                    value={limitTotalDuration}
                    onValueChange={toggleTotalDuration}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <Animated.View
                  style={[
                    { overflow: "hidden" },
                    {
                      opacity: durationAnimationValue,
                      maxHeight: durationAnimationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 500],
                      }),
                    },
                  ]}>
                  {limitTotalDuration && (
                    <>
                      {durationLimits.map((limit, index) => (
                        <View key={limit.id} className="flex-row items-center mt-4 gap-3">
                          <View className="flex-row items-center gap-3">
                            <TextInput
                              className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                              value={limit.value}
                              onChangeText={(text) => {
                                const numericValue = text.replace(/[^0-9]/g, "");
                                const num = parseInt(numericValue) || 0;
                                if (num >= 0) {
                                  updateDurationLimit(limit.id, "value", numericValue || "0");
                                }
                              }}
                              placeholder="60"
                              placeholderTextColor="#8E8E93"
                              keyboardType="numeric"
                            />
                            <Text className="text-base text-[#666]">Minutes</Text>
                          </View>
                          <TouchableOpacity
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                            onPress={() => setShowDurationUnitDropdown(limit.id)}>
                            <Text className="text-base text-black">{limit.unit}</Text>
                            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                          </TouchableOpacity>
                          {durationLimits.length > 1 && (
                            <TouchableOpacity
                              className="w-10 h-10 justify-center items-center bg-[#FFF1F0] rounded-lg border border-[#FFCCC7]"
                              onPress={() => removeDurationLimit(limit.id)}>
                              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        className="flex-row items-center justify-center mt-4 py-3 px-4 bg-transparent border border-black rounded-lg gap-2"
                        onPress={addDurationLimit}>
                        <Ionicons name="add" size={20} color="#000" />
                        <Text className="text-base text-black font-medium">Add Limit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </Animated.View>
              </View>

              {/* Only Show First Available Slot Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-4">
                    <Text className="text-base text-[#333] font-medium mb-1">Only show the first slot of each day as available</Text>
                    <Text className="text-sm text-[#666] leading-5">
                      This will limit your availability for this event type to one slot per day, scheduled at the earliest available time.
                    </Text>
                  </View>
                  <Switch
                    value={onlyShowFirstAvailableSlot}
                    onValueChange={setOnlyShowFirstAvailableSlot}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Max Active Bookings Per Booker Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 mr-4">
                    <Text className="text-base text-[#333] font-medium mb-1">Limit number of upcoming bookings per booker</Text>
                    <Text className="text-sm text-[#666] leading-5">
                      Limit the number of active bookings a booker can make for this event type.
                    </Text>
                  </View>
                  <Switch
                    value={maxActiveBookingsPerBooker}
                    onValueChange={setMaxActiveBookingsPerBooker}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {maxActiveBookingsPerBooker && (
                  <View className="mt-3">
                    <TextInput
                      className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                      value={maxActiveBookingsValue}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9]/g, "");
                        const num = parseInt(numericValue) || 0;
                        if (num >= 0) {
                          setMaxActiveBookingsValue(numericValue || "1");
                        }
                      }}
                      placeholder="1"
                      placeholderTextColor="#8E8E93"
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </View>

              {/* Limit Future Bookings Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 mr-4">
                    <Text className="text-base text-[#333] font-medium mb-1">Limit future bookings</Text>
                    <Text className="text-sm text-[#666] leading-5">
                      Limit how far in the future this event can be booked.
                    </Text>
                  </View>
                  <Switch
                    value={limitFutureBookings}
                    onValueChange={setLimitFutureBookings}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {limitFutureBookings && (
                  <View className="mt-3 gap-3">
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        className={`flex-1 border rounded-lg px-3 py-3 flex-row items-center justify-center ${
                          futureBookingType === "rolling"
                            ? "bg-[#F0F0F0] border-[#333]"
                            : "bg-[#F8F9FA] border-[#E5E5EA]"
                        }`}
                        onPress={() => setFutureBookingType("rolling")}>
                        <Text
                          className={`text-base ${
                            futureBookingType === "rolling" ? "text-[#333] font-semibold" : "text-[#666]"
                          }`}>
                          Rolling
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-1 border rounded-lg px-3 py-3 flex-row items-center justify-center ${
                          futureBookingType === "range"
                            ? "bg-[#F0F0F0] border-[#333]"
                            : "bg-[#F8F9FA] border-[#E5E5EA]"
                        }`}
                        onPress={() => setFutureBookingType("range")}>
                        <Text
                          className={`text-base ${
                            futureBookingType === "range" ? "text-[#333] font-semibold" : "text-[#666]"
                          }`}>
                          Date Range
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {futureBookingType === "rolling" && (
                      <View className="gap-3">
                        <View className="flex-row items-center gap-3">
                          <TextInput
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black flex-1"
                            value={rollingDays}
                            onChangeText={(text) => {
                              const numericValue = text.replace(/[^0-9]/g, "");
                              const num = parseInt(numericValue) || 0;
                              if (num >= 0) {
                                setRollingDays(numericValue || "30");
                              }
                            }}
                            placeholder="30"
                            placeholderTextColor="#8E8E93"
                            keyboardType="numeric"
                          />
                          <TouchableOpacity
                            className={`flex-1 border rounded-lg px-3 py-3 flex-row items-center justify-center ${
                              rollingCalendarDays
                                ? "bg-[#F0F0F0] border-[#333]"
                                : "bg-[#F8F9FA] border-[#E5E5EA]"
                            }`}
                            onPress={() => setRollingCalendarDays(!rollingCalendarDays)}>
                            <Text
                              className={`text-base ${
                                rollingCalendarDays ? "text-[#333] font-semibold" : "text-[#666]"
                              }`}>
                              {rollingCalendarDays ? "Calendar days" : "Business days"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text className="text-sm text-[#666]">days into the future</Text>
                      </View>
                    )}
                    {futureBookingType === "range" && (
                      <View className="gap-3">
                        <View>
                          <Text className="text-sm text-[#666] mb-1.5">Start date</Text>
                          <TextInput
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                            value={rangeStartDate}
                            onChangeText={setRangeStartDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#8E8E93"
                          />
                        </View>
                        <View>
                          <Text className="text-sm text-[#666] mb-1.5">End date</Text>
                          <TextInput
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                            value={rangeEndDate}
                            onChangeText={setRangeEndDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#8E8E93"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

            </View>
          )}

          {activeTab === "advanced" && (
            <View className="gap-3">
              {/* Calendar Event Name Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Calendar event name</Text>
                <TextInput
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black mb-2"
                  value={calendarEventName}
                  onChangeText={setCalendarEventName}
                  placeholder="30min between Pro Example and {Scheduler}"
                  placeholderTextColor="#8E8E93"
                />
                <Text className="text-xs text-[#666]">
                  Use variables like {"{"}Scheduler{"}"} for booker name, {"{"}Organizer{"}"} for your name
                </Text>
            </View>

              {/* Add to Calendar Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Add to calendar</Text>
                <Text className="text-sm text-[#666] mb-3">
                  We'll display this email address as the organizer, and send confirmation emails here.
                </Text>
                <TextInput
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                  value={addToCalendarEmail}
                  onChangeText={setAddToCalendarEmail}
                  placeholder="pro@example.com"
                  placeholderTextColor="#8E8E93"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Layout Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Layout</Text>
                <Text className="text-sm text-[#666] mb-3">
                  You can select multiple and your bookers can switch views.
                </Text>
                
                {/* Layout Options */}
                <View className="gap-2 mb-4">
                  {[
                    { id: "MONTH_VIEW", label: "Month", icon: "calendar-outline" },
                    { id: "WEEK_VIEW", label: "Weekly", icon: "calendar-outline" },
                    { id: "COLUMN_VIEW", label: "Column", icon: "list-outline" },
                  ].map((layout) => (
                    <TouchableOpacity
                      key={layout.id}
                      className={`flex-row items-center justify-between p-3 rounded-lg border ${
                        selectedLayouts.includes(layout.id)
                          ? "border-black bg-[#F0F0F0]"
                          : "border-[#E5E5EA]"
                      }`}
                      onPress={() => {
                        if (selectedLayouts.includes(layout.id)) {
                          // Don't allow deselecting if it's the only one
                          if (selectedLayouts.length > 1) {
                            setSelectedLayouts(selectedLayouts.filter((l) => l !== layout.id));
                            // If removing the default, set a new default
                            if (defaultLayout === layout.id) {
                              const remaining = selectedLayouts.filter((l) => l !== layout.id);
                              setDefaultLayout(remaining[0]);
                            }
                          }
                        } else {
                          setSelectedLayouts([...selectedLayouts, layout.id]);
                        }
                      }}>
                      <View className="flex-row items-center gap-2">
                        <Ionicons name={layout.icon as any} size={20} color="#333" />
                        <Text className="text-base text-[#333]">{layout.label}</Text>
                      </View>
                      {selectedLayouts.includes(layout.id) && (
                        <Ionicons name="checkmark-circle" size={20} color="#000" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Default View */}
                {selectedLayouts.length > 1 && (
                  <View>
                    <Text className="text-sm font-medium text-[#333] mb-2">Default view</Text>
                    <View className="gap-2">
                      {selectedLayouts.map((layoutId) => {
                        const layout = [
                          { id: "MONTH_VIEW", label: "Month" },
                          { id: "WEEK_VIEW", label: "Weekly" },
                          { id: "COLUMN_VIEW", label: "Column" },
                        ].find((l) => l.id === layoutId);
                        if (!layout) return null;
                        return (
                          <TouchableOpacity
                            key={layout.id}
                            className={`flex-row items-center justify-between p-3 rounded-lg border ${
                              defaultLayout === layout.id
                                ? "border-black bg-[#F0F0F0]"
                                : "border-[#E5E5EA]"
                            }`}
                            onPress={() => setDefaultLayout(layout.id)}>
                            <Text className="text-base text-[#333]">{layout.label}</Text>
                            {defaultLayout === layout.id && (
                              <Ionicons name="checkmark-circle" size={20} color="#000" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Booking Questions Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Booking questions</Text>
                <Text className="text-sm text-[#666] mb-3">
                  Customize the questions asked on the booking page.
                </Text>
                <TouchableOpacity
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-4 py-3 flex-row items-center justify-center"
                  onPress={() => Alert.alert("Coming Soon", "Booking questions customization will be available soon.")}>
                  <Ionicons name="add-circle-outline" size={20} color="#666" />
                  <Text className="text-base text-[#666] ml-2">Manage booking questions</Text>
                </TouchableOpacity>
              </View>

              {/* Requires confirmation */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Requires confirmation</Text>
                    <Text className="text-sm text-[#666]">
                      The booking needs to be manually confirmed before it is pushed to your calendar
                    </Text>
                  </View>
                  <Switch
                    value={requiresConfirmation}
                    onValueChange={setRequiresConfirmation}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Disable Cancelling */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Disable Cancelling</Text>
                    <Text className="text-sm text-[#666]">
                      Guests can no longer cancel the event with calendar invite or email
                    </Text>
                  </View>
                  <Switch
                    value={disableCancelling}
                    onValueChange={setDisableCancelling}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Disable Rescheduling */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Disable Rescheduling</Text>
                    <Text className="text-sm text-[#666]">
                      Guests can no longer reschedule the event with calendar invite or email
                    </Text>
                  </View>
                  <Switch
                    value={disableRescheduling}
                    onValueChange={setDisableRescheduling}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Send Cal Video Transcription Emails */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Send Cal Video Transcription Emails</Text>
                    <Text className="text-sm text-[#666]">
                      Send emails with the transcription of the Cal Video after the meeting ends
                    </Text>
                  </View>
                  <Switch
                    value={sendCalVideoTranscription}
                    onValueChange={setSendCalVideoTranscription}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Auto translate */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Auto translate title and description</Text>
                    <Text className="text-sm text-[#666]">
                      Automatically translate titles and descriptions to the visitor's browser language using AI
                    </Text>
                  </View>
                  <Switch
                    value={autoTranslate}
                    onValueChange={setAutoTranslate}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Requires booker email verification */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Requires booker email verification</Text>
                    <Text className="text-sm text-[#666]">
                      To ensure booker's email verification before scheduling events
                    </Text>
                  </View>
                  <Switch
                    value={requiresBookerEmailVerification}
                    onValueChange={setRequiresBookerEmailVerification}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Hide notes in calendar */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Hide notes in calendar</Text>
                    <Text className="text-sm text-[#666]">
                      For privacy reasons, additional inputs and notes will be hidden in the calendar entry
                    </Text>
                  </View>
                  <Switch
                    value={hideCalendarNotes}
                    onValueChange={setHideCalendarNotes}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Hide calendar event details */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Hide calendar event details on shared calendars</Text>
                    <Text className="text-sm text-[#666]">
                      When a calendar is shared, events are visible but details are hidden from those without write access
                    </Text>
                  </View>
                  <Switch
                    value={hideCalendarEventDetails}
                    onValueChange={setHideCalendarEventDetails}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Hide organizer's email */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Hide organizer's email</Text>
                    <Text className="text-sm text-[#666]">
                      Hide organizer's email address from the booking screen, email notifications, and calendar events
                    </Text>
                  </View>
                  <Switch
                    value={hideOrganizerEmail}
                    onValueChange={setHideOrganizerEmail}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Lock timezone */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Lock timezone on booking page</Text>
                    <Text className="text-sm text-[#666]">
                      To lock the timezone on booking page, useful for in-person events
                    </Text>
                  </View>
                  <Switch
                    value={lockTimezone}
                    onValueChange={setLockTimezone}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Allow rescheduling past events */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Allow rescheduling past events</Text>
                    <Text className="text-sm text-[#666]">
                      Enabling this option allows for past events to be rescheduled
                    </Text>
                  </View>
                  <Switch
                    value={allowReschedulingPastEvents}
                    onValueChange={setAllowReschedulingPastEvents}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Allow booking through reschedule link */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Allow booking through reschedule link</Text>
                    <Text className="text-sm text-[#666]">
                      When enabled, users will be able to create a new booking when trying to reschedule a cancelled booking
                    </Text>
                  </View>
                  <Switch
                    value={allowBookingThroughRescheduleLink}
                    onValueChange={setAllowBookingThroughRescheduleLink}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Redirect on booking Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Redirect on booking</Text>
                <Text className="text-sm text-[#666] mb-3">
                  Redirect to a custom URL after a successful booking
                </Text>
                <TextInput
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black mb-3"
                  value={successRedirectUrl}
                  onChangeText={setSuccessRedirectUrl}
                  placeholder="https://example.com/thank-you"
                  placeholderTextColor="#8E8E93"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-[#333]">Forward query parameters</Text>
                  <Switch
                    value={forwardParamsSuccessRedirect}
                    onValueChange={setForwardParamsSuccessRedirect}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Custom Reply-To Email Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Custom 'Reply-To' email</Text>
                <Text className="text-sm text-[#666] mb-3">
                  Use a different email address as the replyTo for confirmation emails instead of the organizer's email
                </Text>
                <TextInput
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                  value={customReplyToEmail}
                  onChangeText={setCustomReplyToEmail}
                  placeholder="reply@example.com"
                  placeholderTextColor="#8E8E93"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Event Type Color Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Event type color</Text>
                <Text className="text-sm text-[#666] mb-3">
                  This is only used for event type & booking differentiation within the app. It is not displayed to bookers.
                </Text>
                <View className="gap-3">
                  <View>
                    <Text className="text-sm font-medium text-[#333] mb-2">Light theme color</Text>
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-12 h-12 rounded-lg border border-[#E5E5EA]"
                        style={{ backgroundColor: eventTypeColorLight }}
                      />
                      <TextInput
                        className="flex-1 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                        value={eventTypeColorLight}
                        onChangeText={setEventTypeColorLight}
                        placeholder="#292929"
                        placeholderTextColor="#8E8E93"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-[#333] mb-2">Dark theme color</Text>
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-12 h-12 rounded-lg border border-[#E5E5EA]"
                        style={{ backgroundColor: eventTypeColorDark }}
                      />
                      <TextInput
                        className="flex-1 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                        value={eventTypeColorDark}
                        onChangeText={setEventTypeColorDark}
                        placeholder="#FAFAFA"
                        placeholderTextColor="#8E8E93"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === "recurring" && (
            <View className="gap-3">
              {/* Recurring Event Toggle Card */}
              <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-[#333] font-medium mb-1">Recurring event</Text>
                    <Text className="text-sm text-[#666]">
                      Set up this event type to repeat at regular intervals
                    </Text>
                  </View>
                  <Switch
                    value={recurringEnabled}
                    onValueChange={setRecurringEnabled}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Recurring Configuration Card - shown when enabled */}
              {recurringEnabled && (
                <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
                  <Text className="text-base font-semibold text-[#333] mb-4">Recurrence pattern</Text>
                  
                  {/* Repeats Every */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-[#333] mb-2">Repeats every</Text>
                    <View className="flex-row items-center gap-3">
                      <TextInput
                        className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                        value={recurringInterval}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, "");
                          const num = parseInt(numericValue) || 1;
                          if (num >= 1 && num <= 20) {
                            setRecurringInterval(numericValue || "1");
                          }
                        }}
                        placeholder="1"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        className="flex-1 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                        onPress={() => {
                          Alert.alert(
                            "Select Frequency",
                            "Choose how often this event repeats",
                            [
                              {
                                text: "Daily",
                                onPress: () => setRecurringFrequency("daily"),
                              },
                              {
                                text: "Weekly",
                                onPress: () => setRecurringFrequency("weekly"),
                              },
                              {
                                text: "Monthly",
                                onPress: () => setRecurringFrequency("monthly"),
                              },
                              {
                                text: "Yearly",
                                onPress: () => setRecurringFrequency("yearly"),
                              },
                              { text: "Cancel", style: "cancel" },
                            ]
                          );
                        }}>
                        <Text className="text-base text-black capitalize">{recurringFrequency}</Text>
                        <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Maximum Occurrences */}
                  <View>
                    <Text className="text-sm font-medium text-[#333] mb-2">Maximum number of events</Text>
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-24 text-center"
                        value={recurringOccurrences}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, "");
                          const num = parseInt(numericValue) || 1;
                          if (num >= 1) {
                            setRecurringOccurrences(numericValue || "1");
                          }
                        }}
                        placeholder="12"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                      />
                      <Text className="text-sm text-[#666]">occurrences</Text>
                    </View>
                    <Text className="text-xs text-[#666] mt-2">
                      The booking will create {recurringOccurrences} events that repeat {recurringFrequency}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === "apps" && (
            <View className="bg-white rounded-2xl p-5 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Connected Apps</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Manage app integrations for this event type.</Text>
            </View>
          )}

          {activeTab === "workflows" && (
            <View className="bg-white rounded-2xl p-5 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Workflows</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Configure automated workflows and actions.</Text>
            </View>
          )}

          {activeTab === "webhooks" && (
            <View className="bg-white rounded-2xl p-5 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Webhooks</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Set up webhook endpoints for event notifications.</Text>
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
          glassEffectStyle="clear">
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
              <GlassView className="rounded-full overflow-hidden bg-[rgba(255,255,255,0.1)]" glassEffectStyle="clear">
                <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={handlePreview}>
                  <Ionicons name="open-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView className="rounded-full overflow-hidden bg-[rgba(255,255,255,0.1)]" glassEffectStyle="clear">
                <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={handleCopyLink}>
                  <Ionicons name="link-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView className="rounded-full overflow-hidden bg-[rgba(255,255,255,0.1)]" glassEffectStyle="clear">
                <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={handleDelete}>
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