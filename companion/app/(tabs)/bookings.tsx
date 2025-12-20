import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
  ActionSheetIOS,
  Linking,
  Modal,
  ScrollView,
} from "react-native";
import type { NativeSyntheticEvent } from "react-native";

import { CalComAPIService, Booking, EventType } from "../../services/calcom";
import { Header } from "../../components/Header";
import { FullScreenModal } from "../../components/FullScreenModal";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { BookingActionsModal } from "../../components/BookingActionsModal";
import { EmptyScreen } from "../../components/EmptyScreen";
import { SvgImage } from "../../components/SvgImage";
import { getAppIconUrl } from "../../utils/getAppIconUrl";
import { useAuth } from "../../contexts/AuthContext";
import {
  useBookings,
  useCancelBooking,
  useConfirmBooking,
  useDeclineBooking,
  useRescheduleBooking,
} from "../../hooks";
import { showErrorAlert } from "../../utils/alerts";
import { offlineAwareRefresh } from "../../utils/network";
import { openInAppBrowser } from "../../utils/browser";

type BookingFilter = "upcoming" | "unconfirmed" | "past" | "cancelled";

// Helper to extract clean meeting URL from potentially wrapped URLs
const extractMeetingUrl = (location: string): string => {
  // Check if it's a goo.gl redirect URL with embedded meet.google.com link
  if (location.includes("goo.gl") && location.includes("meet.google.com")) {
    // Extract the actual meet.google.com URL from the redirect
    const meetMatch = location.match(/meet\.google\.com\/[a-z]+-[a-z]+-[a-z]+/i);
    if (meetMatch) {
      return `https://${meetMatch[0]}`;
    }
  }
  return location;
};

// Helper to detect meeting type from location URL and get icon/label
const getMeetingInfo = (
  location?: string
): { appId: string; label: string; iconUrl: string | null; cleanUrl: string } | null => {
  if (!location) return null;

  // Check if it's a URL
  if (!location.match(/^https?:\/\//)) return null;

  const lowerLocation = location.toLowerCase();
  const cleanUrl = extractMeetingUrl(location);

  // Cal Video
  if (lowerLocation.includes("cal.com/video") || lowerLocation.includes("cal.video")) {
    return {
      appId: "cal-video",
      label: "Join Cal Video",
      iconUrl: getAppIconUrl("daily_video", "cal-video"),
      cleanUrl,
    };
  }

  // Google Meet (including goo.gl redirect URLs)
  if (
    lowerLocation.includes("meet.google.com") ||
    (lowerLocation.includes("goo.gl") && lowerLocation.includes("meet"))
  ) {
    return {
      appId: "google-meet",
      label: "Join Google Meet",
      iconUrl: getAppIconUrl("google_video", "google-meet"),
      cleanUrl,
    };
  }

  // Zoom
  if (lowerLocation.includes("zoom.us") || lowerLocation.includes("zoom.com")) {
    return {
      appId: "zoom",
      label: "Join Zoom",
      iconUrl: getAppIconUrl("zoom_video", "zoom"),
      cleanUrl,
    };
  }

  // Microsoft Teams
  if (lowerLocation.includes("teams.microsoft.com") || lowerLocation.includes("teams.live.com")) {
    return {
      appId: "msteams",
      label: "Join Microsoft Teams",
      iconUrl: getAppIconUrl("office365_video", "msteams"),
      cleanUrl,
    };
  }

  // Webex
  if (lowerLocation.includes("webex.com")) {
    return {
      appId: "webex",
      label: "Join Webex",
      iconUrl: getAppIconUrl("webex_video", "webex"),
      cleanUrl,
    };
  }

  // Jitsi
  if (lowerLocation.includes("meet.jit.si") || lowerLocation.includes("jitsi")) {
    return {
      appId: "jitsi",
      label: "Join Jitsi",
      iconUrl: getAppIconUrl("jitsi_video", "jitsi"),
      cleanUrl,
    };
  }

  // Not a recognized conferencing app
  return null;
};

export default function Bookings() {
  const router = useRouter();
  const { userInfo } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("upcoming");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const [selectedEventTypeLabel, setSelectedEventTypeLabel] = useState<string | null>(null);
  const [eventTypesLoading, setEventTypesLoading] = useState(false);
  const [showBookingActionsModal, setShowBookingActionsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectBooking, setRejectBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filterOptions: { key: BookingFilter; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "unconfirmed", label: "Unconfirmed" },
    { key: "past", label: "Past" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filterLabels = filterOptions.map((option) => option.label);
  const activeIndex = filterOptions.findIndex((option) => option.key === activeFilter);

  // Get filters for the active tab
  const getFiltersForActiveTab = () => {
    switch (activeFilter) {
      case "upcoming":
        return { status: ["upcoming"], limit: 50 };
      case "unconfirmed":
        return { status: ["unconfirmed"], limit: 50 };
      case "past":
        return { status: ["past"], limit: 100 };
      case "cancelled":
        return { status: ["cancelled"], limit: 100 };
      default:
        return { status: ["upcoming"], limit: 50 };
    }
  };

  // Use React Query hook for fetching bookings
  const {
    data: rawBookings = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useBookings(getFiltersForActiveTab());

  // Show refresh indicator when fetching
  const refreshing = isFetching && !loading;

  // Cancel booking mutation
  const { mutate: cancelBookingMutation } = useCancelBooking();

  // Confirm booking mutation
  const { mutate: confirmBookingMutation, isPending: isConfirming } = useConfirmBooking();

  // Decline booking mutation
  const { mutate: declineBookingMutation, isPending: isDeclining } = useDeclineBooking();

  // Reschedule booking mutation
  const { mutate: rescheduleBookingMutation, isPending: isRescheduling } = useRescheduleBooking();

  // Sort bookings based on active filter
  const bookings = useMemo(() => {
    if (!rawBookings || !Array.isArray(rawBookings)) return [];

    const sorted = [...rawBookings];
    switch (activeFilter) {
      case "upcoming":
      case "unconfirmed":
        // Sort by start time ascending
        return sorted.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      case "past":
      case "cancelled":
        // Sort by start time descending (latest first)
        return sorted.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      default:
        return sorted;
    }
  }, [rawBookings, activeFilter]);

  // Convert query error to string
  // Don't show error UI for authentication errors (user will be redirected to login)
  // Only show error UI in development mode for other errors
  const isAuthError =
    queryError?.message?.includes("Authentication") ||
    queryError?.message?.includes("sign in") ||
    queryError?.message?.includes("401");
  const error = queryError && !isAuthError && __DEV__ ? "Failed to load bookings." : null;

  // Clear search and event type filter when status filter changes
  useEffect(() => {
    setSearchQuery("");
    setSelectedEventTypeId(null);
    setSelectedEventTypeLabel(null);
  }, [activeFilter]);

  // Handle pull-to-refresh (offline-aware)
  const onRefresh = () => offlineAwareRefresh(refetch);

  // Apply local filters (search and event type) using useMemo
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Apply event type filter
    if (selectedEventTypeId !== null) {
      filtered = filtered.filter((booking) => booking.eventTypeId === selectedEventTypeId);
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          // Search in booking title
          booking.title?.toLowerCase().includes(searchLower) ||
          // Search in booking description
          booking.description?.toLowerCase().includes(searchLower) ||
          // Search in event type title
          booking.eventType?.title?.toLowerCase().includes(searchLower) ||
          // Search in attendee names
          (booking.attendees &&
            booking.attendees.some((attendee) =>
              attendee.name?.toLowerCase().includes(searchLower)
            )) ||
          // Search in attendee emails
          (booking.attendees &&
            booking.attendees.some((attendee) =>
              attendee.email?.toLowerCase().includes(searchLower)
            )) ||
          // Search in location
          booking.location?.toLowerCase().includes(searchLower) ||
          // Search in user name
          booking.user?.name?.toLowerCase().includes(searchLower) ||
          // Search in user email
          booking.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [bookings, searchQuery, selectedEventTypeId]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const fetchEventTypes = async () => {
    try {
      setEventTypesLoading(true);
      const types = await CalComAPIService.getEventTypes();
      setEventTypes(types);
    } catch (err) {
      console.error("Error fetching event types:", err);
      // Error is logged but not displayed to user for event type filter
    } finally {
      setEventTypesLoading(false);
    }
  };

  const handleFilterButtonPress = () => {
    setShowFilterModal(true);
    if (eventTypes.length === 0) {
      fetchEventTypes();
    }
  };

  const clearEventTypeFilter = () => {
    setSelectedEventTypeId(null);
    setSelectedEventTypeLabel(null);
  };

  const handleEventTypeSelect = (eventTypeId: number | null, label?: string | null) => {
    if (eventTypeId === null) {
      clearEventTypeFilter();
    } else {
      setSelectedEventTypeId(eventTypeId);
      setSelectedEventTypeLabel(label || null);
    }
    setShowFilterModal(false);
  };

  const handleFilterChange = (filter: BookingFilter) => {
    setActiveFilter(filter);
  };

  const handleSegmentChange = (event: NativeSyntheticEvent<{ selectedSegmentIndex: number }>) => {
    const { selectedSegmentIndex } = event.nativeEvent;
    const selectedFilter = filterOptions[selectedSegmentIndex];
    if (selectedFilter) {
      handleFilterChange(selectedFilter.key);
    }
  };

  const getEmptyStateContent = () => {
    switch (activeFilter) {
      case "upcoming":
        return {
          icon: "calendar-outline" as const,
          title: "No upcoming bookings",
          text: "As soon as someone books a time with you it will show up here.",
        };
      case "unconfirmed":
        return {
          icon: "calendar-outline" as const,
          title: "No unconfirmed bookings",
          text: "Your unconfirmed bookings will show up here.",
        };
      case "past":
        return {
          icon: "calendar-outline" as const,
          title: "No past bookings",
          text: "Your past bookings will show up here.",
        };
      case "cancelled":
        return {
          icon: "calendar-outline" as const,
          title: "No cancelled bookings",
          text: "Your canceled bookings will show up here.",
        };
      default:
        return {
          icon: "calendar-outline" as const,
          title: "No bookings found",
          text: "Your bookings will appear here.",
        };
    }
  };

  const supportsLiquidGlass = isLiquidGlassAvailable();

  const renderSegmentedControl = () => {
    const segmentedControlContent = (
      <SegmentedControl
        values={filterLabels}
        selectedIndex={activeIndex}
        onChange={handleSegmentChange}
        style={{ height: 40 }}
        appearance="light"
        activeFontStyle={{ color: "#007AFF", fontWeight: "600", fontSize: 14 }}
        fontStyle={{ color: "#8E8E93", fontSize: 14 }}
      />
    );

    return (
      <>
        {supportsLiquidGlass ? (
          <GlassView
            glassEffectStyle="regular"
            style={{ paddingHorizontal: 8, paddingVertical: 12 }}
          >
            {segmentedControlContent}
          </GlassView>
        ) : (
          <View className="border-b border-gray-200 bg-white px-2 py-3 md:px-4">
            {segmentedControlContent}
          </View>
        )}
        <View className="border-b border-gray-300 bg-gray-100 px-2 py-2 md:px-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="flex-row items-center rounded-lg border border-gray-200 bg-white"
              style={{ width: "20%", paddingHorizontal: 8, paddingVertical: 6 }}
              onPress={handleFilterButtonPress}
            >
              <Ionicons name="options-outline" size={14} color="#333" />
              <Text className="text-sm text-[#333]" style={{ marginLeft: 4 }}>
                Filter
              </Text>
            </TouchableOpacity>
            <View style={{ width: "75%" }}>
              <TextInput
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                placeholder="Search bookings"
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
          {selectedEventTypeId !== null ? (
            <View className="mt-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Text className="flex-1 text-sm text-[#333]">
                Filtered by {selectedEventTypeLabel || "event type"}
              </Text>
              <TouchableOpacity onPress={clearEventTypeFilter}>
                <Text className="text-sm font-semibold text-[#007AFF]">Clear filter</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </>
    );
  };

  const handleBookingPress = (booking: Booking) => {
    router.push({
      pathname: "/booking-detail",
      params: { uid: booking.uid },
    });
  };

  const handleBookingPressOld = (booking: Booking) => {
    if (Platform.OS !== "ios") {
      // Fallback for non-iOS platforms
      const attendeesList = booking.attendees?.map((att) => att.name).join(", ") || "No attendees";
      const startTime = booking.start || booking.startTime || "";
      const endTime = booking.end || booking.endTime || "";

      const actions = getBookingActions(booking);
      const alertActions = actions.map((action) => ({
        text: action.title,
        style: (action.destructive ? "destructive" : "default") as
          | "destructive"
          | "default"
          | "cancel",
        onPress: action.onPress,
      }));
      alertActions.unshift({ text: "Cancel", style: "cancel" as const, onPress: () => {} });

      Alert.alert(
        booking.title,
        `${booking.description ? `${booking.description}\n\n` : ""}Time: ${formatDateTime(
          startTime
        )} - ${formatTime(endTime)}\nAttendees: ${attendeesList}\nStatus: ${booking.status}${
          booking.location ? `\nLocation: ${booking.location}` : ""
        }`,
        alertActions
      );
      return;
    }

    const actions = getBookingActions(booking);
    const options = ["Cancel", ...actions.map((action) => action.title)];
    const destructiveButtonIndex = actions.findIndex((action) => action.destructive);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex:
          destructiveButtonIndex >= 0 ? destructiveButtonIndex + 1 : undefined,
        cancelButtonIndex: 0,
        title: booking.title,
        message: getBookingDetailsMessage(booking),
      },
      (buttonIndex) => {
        if (buttonIndex === 0) return; // Cancel

        const actionIndex = buttonIndex - 1;
        if (actions[actionIndex]) {
          actions[actionIndex].onPress();
        }
      }
    );
  };

  const getBookingDetailsMessage = (booking: Booking): string => {
    const attendeesList = booking.attendees?.map((att) => att.name).join(", ") || "No attendees";
    const startTime = booking.start || booking.startTime || "";
    const endTime = booking.end || booking.endTime || "";

    return `${booking.description ? `${booking.description}\n\n` : ""}Time: ${formatDateTime(
      startTime
    )} - ${formatTime(endTime)}\nAttendees: ${attendeesList}\nStatus: ${formatStatusText(booking.status)}${
      booking.location ? `\nLocation: ${booking.location}` : ""
    }`;
  };

  const getBookingActions = (booking: Booking) => {
    const baseActions = [
      {
        title: "Open Location",
        onPress: () => handleOpenLocation(booking),
        destructive: false,
      },
    ];

    const specificActions = (() => {
      switch (activeFilter) {
        case "upcoming":
          return [
            {
              title: "Request Reschedule",
              onPress: () => handleRescheduleBooking(booking),
              destructive: false,
            },
            {
              title: "Cancel event",
              onPress: () => handleCancelEvent(booking),
              destructive: true,
            },
          ];
        case "unconfirmed":
          return [
            {
              title: "Confirm booking",
              onPress: () => handleConfirmBooking(booking),
              destructive: false,
            },
            {
              title: "Decline booking",
              onPress: () => handleRejectBooking(booking),
              destructive: true,
            },
          ];
        case "past":
          return [];
        case "cancelled":
          return [];
        default:
          return [];
      }
    })();

    return [...baseActions, ...specificActions];
  };

  const handleOpenLocation = async (booking: Booking) => {
    if (!booking.location) {
      Alert.alert("No Location", "This booking doesn't have a location set.");
      return;
    }

    try {
      // Check if location is a URL (starts with http:// or https://)
      if (booking.location.match(/^https?:\/\//)) {
        // Open web URLs in in-app browser
        await openInAppBrowser(booking.location, "meeting link");
      } else {
        // If it's not a URL, try to open it as a location in maps
        const mapsUrl =
          Platform.OS === "ios"
            ? `maps://maps.apple.com/?q=${encodeURIComponent(booking.location)}`
            : `geo:0,0?q=${encodeURIComponent(booking.location)}`;

        const supported = await Linking.canOpenURL(mapsUrl);
        if (supported) {
          await Linking.openURL(mapsUrl);
        } else {
          // Fallback to Google Maps in in-app browser
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            booking.location
          )}`;
          await openInAppBrowser(googleMapsUrl, "Google Maps");
        }
      }
    } catch (error) {
      showErrorAlert("Error", "Failed to open location. Please try again.");
    }
  };

  const handleRescheduleBooking = (booking: Booking) => {
    // Pre-fill with the current booking date/time
    const currentDate = new Date(booking.startTime);
    const dateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = currentDate.toTimeString().slice(0, 5); // HH:MM

    setRescheduleBooking(booking);
    setRescheduleDate(dateStr);
    setRescheduleTime(timeStr);
    setRescheduleReason("");
    setShowRescheduleModal(true);
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) {
      showErrorAlert("Error", "Please enter both date and time");
      return;
    }

    // Parse the date and time
    const dateTimeStr = `${rescheduleDate}T${rescheduleTime}:00`;
    const newDateTime = new Date(dateTimeStr);

    // Validate the date
    if (isNaN(newDateTime.getTime())) {
      showErrorAlert(
        "Error",
        "Invalid date or time format. Please use YYYY-MM-DD for date and HH:MM for time."
      );
      return;
    }

    // Check if the new time is in the future
    if (newDateTime <= new Date()) {
      showErrorAlert("Error", "Please select a future date and time");
      return;
    }

    // Convert to UTC ISO string
    const startUtc = newDateTime.toISOString();

    rescheduleBookingMutation(
      {
        uid: rescheduleBooking.uid,
        start: startUtc,
        reschedulingReason: rescheduleReason || undefined,
      },
      {
        onSuccess: () => {
          setShowRescheduleModal(false);
          setRescheduleBooking(null);
          Alert.alert("Success", "Booking rescheduled successfully");
        },
        onError: (error) => {
          showErrorAlert("Error", error.message || "Failed to reschedule booking");
        },
      }
    );
  };

  const handleCancelEvent = (booking: Booking) => {
    Alert.alert("Cancel Event", `Are you sure you want to cancel "${booking.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Cancel Event",
        style: "destructive",
        onPress: () => {
          // Prompt for cancellation reason
          Alert.prompt(
            "Cancellation Reason",
            "Please provide a reason for cancelling this booking:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Cancel Event",
                style: "destructive",
                onPress: (reason) => {
                  const cancellationReason = reason?.trim() || "Event cancelled by host";
                  cancelBookingMutation(
                    { uid: booking.uid, reason: cancellationReason },
                    {
                      onSuccess: () => {
                        Alert.alert("Success", "Event cancelled successfully");
                      },
                      onError: (error) => {
                        console.error("Failed to cancel booking:", error);
                        showErrorAlert("Error", "Failed to cancel event. Please try again.");
                      },
                    }
                  );
                },
              },
            ],
            "plain-text",
            "",
            "default"
          );
        },
      },
    ]);
  };

  const handleConfirmBooking = (booking: Booking) => {
    Alert.alert("Confirm Booking", `Are you sure you want to confirm "${booking.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          confirmBookingMutation(
            { uid: booking.uid },
            {
              onSuccess: () => {
                Alert.alert("Success", "Booking confirmed successfully");
              },
              onError: (error) => {
                showErrorAlert("Error", error.message || "Failed to confirm booking");
              },
            }
          );
        },
      },
    ]);
  };

  const handleRejectBooking = (booking: Booking) => {
    Alert.alert("Decline Booking", `Are you sure you want to decline "${booking.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: () => {
          // Show optional reason input
          Alert.prompt(
            "Decline Reason",
            "Optionally provide a reason for declining (press OK to skip)",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "OK",
                onPress: (reason?: string) => {
                  declineBookingMutation(
                    { uid: booking.uid, reason: reason || undefined },
                    {
                      onSuccess: () => {
                        Alert.alert("Success", "Booking declined successfully");
                      },
                      onError: (error) => {
                        showErrorAlert("Error", error.message || "Failed to decline booking");
                      },
                    }
                  );
                },
              },
            ],
            "plain-text",
            "",
            "default"
          );
        },
      },
    ]);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) {
      return "";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "";
      }
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", error, dateString);
      return "";
    }
  };

  const formatDate = (dateString: string, isUpcoming: boolean) => {
    if (!dateString) {
      return "";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "";
      }
      const bookingYear = date.getFullYear();
      const currentYear = new Date().getFullYear();
      const isDifferentYear = bookingYear !== currentYear;

      if (isUpcoming) {
        // Format: "ddd, D MMM" or "ddd, D MMM YYYY" if different year
        const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
        const day = date.getDate();
        const month = date.toLocaleDateString("en-US", { month: "short" });
        if (isDifferentYear) {
          return `${weekday}, ${day} ${month} ${bookingYear}`;
        }
        return `${weekday}, ${day} ${month}`;
      } else {
        // Format: "D MMMM YYYY" for past bookings
        return date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "";
    }
  };

  const getStatusColor = (status: string) => {
    // API v2 2024-08-13 returns status in lowercase, so normalize to uppercase for comparison
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case "ACCEPTED":
        return "#34C759";
      case "PENDING":
        return "#FF9500";
      case "CANCELLED":
        return "#FF3B30";
      case "REJECTED":
        return "#FF3B30";
      default:
        return "#666";
    }
  };

  const formatStatusText = (status: string) => {
    // Capitalize first letter for display
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const formatMonthYear = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "";
      }
      const now = new Date();
      const isCurrentMonth =
        date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

      if (isCurrentMonth) {
        return "This month";
      }

      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      return "";
    }
  };

  const getMonthYearKey = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "";
      }
      return `${date.getFullYear()}-${date.getMonth()}`;
    } catch (error) {
      return "";
    }
  };

  type ListItem =
    | { type: "monthHeader"; monthYear: string; key: string }
    | { type: "booking"; booking: Booking; key: string };

  const groupBookingsByMonth = (bookings: Booking[]): ListItem[] => {
    const grouped: ListItem[] = [];
    let currentMonthYear: string | null = null;

    bookings.forEach((booking) => {
      const startTime = booking.start || booking.startTime || "";
      if (!startTime) return;

      const monthYearKey = getMonthYearKey(startTime);
      const monthYear = formatMonthYear(startTime);

      if (monthYearKey !== currentMonthYear) {
        currentMonthYear = monthYearKey;
        grouped.push({
          type: "monthHeader",
          monthYear,
          key: `month-${monthYearKey}`,
        });
      }

      grouped.push({
        type: "booking",
        booking,
        key: booking.id.toString(),
      });
    });

    return grouped;
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const startTime = item.start || item.startTime || "";
    const endTime = item.end || item.endTime || "";
    const isUpcoming = new Date(endTime) >= new Date();
    const isPending = item.status?.toUpperCase() === "PENDING";
    const isCancelled = item.status?.toUpperCase() === "CANCELLED";
    const isRejected = item.status?.toUpperCase() === "REJECTED";

    const getHostAndAttendeesDisplay = () => {
      const hasHostOrAttendees =
        (item.hosts && item.hosts.length > 0) ||
        item.user ||
        (item.attendees && item.attendees.length > 0);

      if (!hasHostOrAttendees) return null;

      const currentUserEmail = userInfo?.email?.toLowerCase();
      const hostEmail = item.hosts?.[0]?.email?.toLowerCase() || item.user?.email?.toLowerCase();
      const isCurrentUserHost = currentUserEmail && hostEmail && currentUserEmail === hostEmail;

      const hostName = isCurrentUserHost
        ? "You"
        : item.hosts?.[0]?.name || item.hosts?.[0]?.email || item.user?.name || item.user?.email;

      const attendeesDisplay =
        item.attendees && item.attendees.length > 0
          ? item.attendees.length === 1
            ? item.attendees[0].name || item.attendees[0].email
            : item.attendees
                .slice(0, 2)
                .map((att) => att.name || att.email)
                .join(", ") +
              (item.attendees.length > 2 ? ` and ${item.attendees.length - 2} more` : "")
          : null;

      if (hostName && attendeesDisplay) {
        return `${hostName} and ${attendeesDisplay}`;
      } else if (hostName) {
        return hostName;
      } else if (attendeesDisplay) {
        return attendeesDisplay;
      }
      return null;
    };

    const hostAndAttendeesDisplay = getHostAndAttendeesDisplay();
    const meetingInfo = getMeetingInfo(item.location);

    return (
      <View className="border-b border-[#E5E5EA] bg-white">
        <TouchableOpacity
          className="active:bg-[#F8F9FA]"
          onPress={() => handleBookingPress(item)}
          onLongPress={() => {
            setSelectedBooking(item);
            setShowBookingActionsModal(true);
          }}
          style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
        >
          {/* Time and Date Row */}
          <View className="mb-2 flex-row flex-wrap items-center">
            <Text className="text-sm font-medium text-[#333]">
              {formatDate(startTime, isUpcoming)}
            </Text>
            <Text className="ml-2 text-sm text-[#666]">
              {formatTime(startTime)} - {formatTime(endTime)}
            </Text>
          </View>
          {/* Badges Row */}
          <View className="mb-3 flex-row flex-wrap items-center">
            {isPending ? (
              <View className="mb-1 mr-2 rounded bg-[#FF9500] px-2 py-0.5">
                <Text className="text-xs font-medium text-white">Unconfirmed</Text>
              </View>
            ) : null}
          </View>
          {/* Title */}
          <Text
            className={`mb-2 text-lg font-medium leading-5 text-[#333] ${isCancelled || isRejected ? "line-through" : ""}`}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {/* Description */}
          {item.description ? (
            <Text className="mb-2 text-sm leading-5 text-[#666]" numberOfLines={1}>
              &quot;{item.description}&quot;
            </Text>
          ) : null}
          {/* Host and Attendees */}
          {hostAndAttendeesDisplay ? (
            <Text className="mb-2 text-sm text-[#333]">{hostAndAttendeesDisplay}</Text>
          ) : null}
          {/* Meeting Link */}
          {meetingInfo ? (
            <View className="mb-1 flex-row">
              <TouchableOpacity
                className="flex-row items-center"
                style={{ alignSelf: "flex-start" }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                onPress={async (e) => {
                  e.stopPropagation();
                  try {
                    await Linking.openURL(meetingInfo.cleanUrl);
                  } catch {
                    showErrorAlert("Error", "Failed to open meeting link. Please try again.");
                  }
                }}
              >
                {meetingInfo.iconUrl ? (
                  <SvgImage
                    uri={meetingInfo.iconUrl}
                    width={16}
                    height={16}
                    style={{ marginRight: 6 }}
                  />
                ) : (
                  <Ionicons name="videocam" size={16} color="#007AFF" style={{ marginRight: 6 }} />
                )}
                <Text className="text-sm font-medium text-[#007AFF]">{meetingInfo.label}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </TouchableOpacity>
        <View
          className="flex-row items-center justify-end"
          style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
        >
          {isPending ? (
            <>
              <TouchableOpacity
                className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-white"
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: isConfirming || isDeclining ? 0.5 : 1,
                }}
                disabled={isConfirming || isDeclining}
                onPress={(e) => {
                  e.stopPropagation();
                  confirmBookingMutation(
                    { uid: item.uid },
                    {
                      onSuccess: () => {
                        Alert.alert("Success", "Booking confirmed successfully");
                      },
                      onError: (error) => {
                        showErrorAlert("Error", "Failed to confirm booking. Please try again.");
                      },
                    }
                  );
                }}
              >
                <Ionicons name="checkmark" size={16} color="#3C3F44" />
                <Text className="ml-1 text-sm font-medium text-[#3C3F44]">Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-white"
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: isConfirming || isDeclining ? 0.5 : 1,
                }}
                disabled={isConfirming || isDeclining}
                onPress={(e) => {
                  e.stopPropagation();
                  setRejectBooking(item);
                  setRejectReason("");
                  setShowRejectModal(true);
                }}
              >
                <Ionicons name="close" size={16} color="#3C3F44" />
                <Text className="ml-1 text-sm font-medium text-[#3C3F44]">Reject</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity
            className="items-center justify-center rounded-lg border border-[#E5E5EA]"
            style={{ width: 32, height: 32 }}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedBooking(item);
              setShowBookingActionsModal(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === "monthHeader") {
      return (
        <View className="border-b border-[#E5E5EA] bg-[#E5E5EA] px-2 py-3 md:px-4">
          <Text className="text-base font-bold text-[#333]">{item.monthYear}</Text>
        </View>
      );
    }
    return renderBooking({ item: item.booking });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        {renderSegmentedControl()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        {renderSegmentedControl()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
            Unable to load bookings
          </Text>
          <Text className="mb-6 text-center text-base text-gray-500">{error}</Text>
          <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={() => refetch()}>
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Determine what content to show
  const showEmptyState = bookings.length === 0 && !loading;
  const showSearchEmptyState =
    filteredBookings.length === 0 && searchQuery.trim() !== "" && !loading && !showEmptyState;
  const showList = !showEmptyState && !showSearchEmptyState && !loading;
  const emptyState = getEmptyStateContent();

  return (
    <View className="flex-1 bg-[#f8f9fa]">
      <Header />
      {renderSegmentedControl()}

      {/* Empty state - no bookings */}
      {showEmptyState ? (
        <View className="flex-1 bg-gray-50" style={{ paddingBottom: 100 }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <EmptyScreen
              icon={emptyState.icon}
              headline={emptyState.title}
              description={emptyState.text}
            />
          </ScrollView>
        </View>
      ) : null}

      {/* Search empty state */}
      {showSearchEmptyState ? (
        <View className="flex-1 bg-gray-50" style={{ paddingBottom: 100 }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <EmptyScreen
              icon="search-outline"
              headline={`No results found for "${searchQuery}"`}
              description="Try searching with different keywords"
            />
          </ScrollView>
        </View>
      ) : null}

      {/* Bookings list */}
      {showList ? (
        <View className="flex-1 px-2 pt-4 md:px-4">
          <View className="flex-1 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
            <FlatList
              data={groupBookingsByMonth(filteredBookings)}
              keyExtractor={(item) => item.key}
              renderItem={renderListItem}
              contentContainerStyle={{ paddingBottom: 90 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      ) : null}

      {/* Filter Modal */}
      <FullScreenModal
        visible={showFilterModal}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[85%] max-w-[350px] rounded-2xl bg-white p-5"
          >
            <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
              Filter by Event Type
            </Text>

            {eventTypesLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#333" />
                <Text className="mt-2 text-sm text-[#666]">Loading event types...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: 400 }}>
                {eventTypes.map((eventType) => (
                  <TouchableOpacity
                    key={eventType.id}
                    className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      selectedEventTypeId === eventType.id ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => handleEventTypeSelect(eventType.id, eventType.title)}
                  >
                    <Text
                      className={`text-base text-[#333] ${selectedEventTypeId === eventType.id ? "font-semibold" : ""}`}
                    >
                      {eventType.title}
                    </Text>
                    {selectedEventTypeId === eventType.id ? (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    ) : null}
                  </TouchableOpacity>
                ))}

                {eventTypes.length === 0 ? (
                  <View className="items-center py-4">
                    <Text className="text-sm text-[#666]">No event types found</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Booking Actions Modal */}
      <BookingActionsModal
        visible={showBookingActionsModal}
        onClose={() => setShowBookingActionsModal(false)}
        booking={selectedBooking}
        hasLocationUrl={!!selectedBooking?.location}
        isUpcoming={
          selectedBooking
            ? new Date(selectedBooking.endTime || selectedBooking.end || "") >= new Date() &&
              selectedBooking.status?.toUpperCase() !== "PENDING"
            : false
        }
        isPast={
          selectedBooking
            ? new Date(selectedBooking.endTime || selectedBooking.end || "") < new Date()
            : false
        }
        isCancelled={selectedBooking?.status?.toUpperCase() === "CANCELLED"}
        isUnconfirmed={selectedBooking?.status?.toUpperCase() === "PENDING"}
        onReschedule={() => {
          if (selectedBooking) handleRescheduleBooking(selectedBooking);
        }}
        onEditLocation={() => {
          Alert.alert("Edit Location", "Edit location functionality coming soon");
        }}
        onAddGuests={() => {
          Alert.alert("Add Guests", "Add guests functionality coming soon");
        }}
        onViewRecordings={() => {
          Alert.alert("View Recordings", "View recordings functionality coming soon");
        }}
        onMeetingSessionDetails={() => {
          Alert.alert(
            "Meeting Session Details",
            "Meeting session details functionality coming soon"
          );
        }}
        onMarkNoShow={() => {
          Alert.alert("Mark as No-Show", "Mark as no-show functionality coming soon");
        }}
        onReportBooking={() => {
          Alert.alert("Report Booking", "Report booking functionality coming soon");
        }}
        onCancelBooking={() => {
          if (selectedBooking) handleCancelEvent(selectedBooking);
        }}
      />

      {/* Reschedule Modal */}
      <FullScreenModal
        visible={showRescheduleModal}
        onRequestClose={() => {
          setShowRescheduleModal(false);
          setRescheduleBooking(null);
        }}
      >
        <ScrollView className="flex-1 p-4">
          {rescheduleBooking ? (
            <>
              <Text className="mb-4 text-base text-gray-600">
                Reschedule "{rescheduleBooking.title}"
              </Text>

              {/* Date Input */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  New Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  value={rescheduleDate}
                  onChangeText={setRescheduleDate}
                  placeholder="2024-12-25"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="default"
                />
              </View>

              {/* Time Input */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  New Time (HH:MM, 24-hour format)
                </Text>
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  value={rescheduleTime}
                  onChangeText={setRescheduleTime}
                  placeholder="14:30"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="default"
                />
              </View>

              {/* Reason Input */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-gray-700">Reason (optional)</Text>
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  value={rescheduleReason}
                  onChangeText={setRescheduleReason}
                  placeholder="Enter reason for rescheduling..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 80 }}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className={`rounded-lg p-4 ${isRescheduling ? "bg-gray-400" : "bg-black"}`}
                onPress={handleSubmitReschedule}
                disabled={isRescheduling}
              >
                {isRescheduling ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    Reschedule Booking
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                className="mt-3 rounded-lg bg-gray-100 p-4"
                onPress={() => {
                  setShowRescheduleModal(false);
                  setRescheduleBooking(null);
                }}
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </FullScreenModal>

      {/* Reject Booking Modal */}
      <FullScreenModal
        visible={showRejectModal}
        animationType="fade"
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectBooking(null);
          setRejectReason("");
        }}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-4"
          activeOpacity={1}
          onPress={() => {
            setShowRejectModal(false);
            setRejectBooking(null);
            setRejectReason("");
          }}
        >
          <TouchableOpacity
            className="w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-5">
              {/* Title */}
              <Text className="mb-1 text-lg font-semibold text-gray-900">
                Reject the booking request?
              </Text>

              {/* Description */}
              <Text className="mb-4 text-sm text-gray-500">
                Are you sure you want to reject the booking? We'll let the person who tried to book
                know. You can provide a reason below.
              </Text>

              {/* Reason Input */}
              <View className="mb-5">
                <Text className="mb-1.5 text-sm text-gray-700">
                  Reason for rejecting <Text className="font-normal text-gray-400">(Optional)</Text>
                </Text>
                <TextInput
                  className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Enter reason..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 70 }}
                />
              </View>

              {/* Separator */}
              <View className="mb-4 h-px bg-gray-200" />

              {/* Buttons Row */}
              <View className="flex-row justify-end" style={{ gap: 8 }}>
                {/* Close Button */}
                <TouchableOpacity
                  className="rounded-md border border-gray-300 bg-white px-4 py-2"
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectBooking(null);
                    setRejectReason("");
                  }}
                >
                  <Text className="text-sm font-medium text-gray-700">Close</Text>
                </TouchableOpacity>

                {/* Reject Button */}
                <TouchableOpacity
                  className="rounded-md bg-gray-900 px-4 py-2"
                  onPress={() => {
                    if (rejectBooking) {
                      declineBookingMutation(
                        { uid: rejectBooking.uid, reason: rejectReason || undefined },
                        {
                          onSuccess: () => {
                            setShowRejectModal(false);
                            setRejectBooking(null);
                            setRejectReason("");
                            Alert.alert("Success", "Booking rejected successfully");
                          },
                          onError: (error) => {
                            showErrorAlert("Error", "Failed to reject booking. Please try again.");
                          },
                        }
                      );
                    }
                  }}
                  disabled={isDeclining}
                  style={{ opacity: isDeclining ? 0.5 : 1 }}
                >
                  <Text className="text-sm font-medium text-white">Reject the booking</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>
    </View>
  );
}
