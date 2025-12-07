import { Ionicons } from "@expo/vector-icons";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
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

type BookingFilter = "upcoming" | "unconfirmed" | "past" | "cancelled";

type ActiveModal = "FILTER" | "ACTIONS" | null;

export default function Bookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("upcoming");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const [selectedEventTypeLabel, setSelectedEventTypeLabel] = useState<string | null>(null);
  const [eventTypesLoading, setEventTypesLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filterOptions: { key: BookingFilter; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "unconfirmed", label: "Unconfirmed" },
    { key: "past", label: "Past" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filterLabels = filterOptions.map((option) => option.label);
  const activeIndex = filterOptions.findIndex((option) => option.key === activeFilter);

  const getFiltersForActiveTab = () => {
    switch (activeFilter) {
      case "upcoming":
        return {
          status: ["upcoming"],
          limit: 50,
        };
      case "unconfirmed":
        return {
          status: ["unconfirmed"],
          limit: 50,
        };
      case "past":
        return {
          status: ["past"],
          limit: 100,
        };
      case "cancelled":
        return {
          status: ["cancelled"],
          limit: 100,
        };
      default:
        return {
          status: ["upcoming"],
          limit: 50,
        };
    }
  };

  const fetchBookings = async () => {
    try {
      setError(null);

      // First, test the raw bookings API call (only on first load)
      if (loading) {
        await CalComAPIService.testRawBookingsAPI();
      }

      const filters = getFiltersForActiveTab();

      const data = await CalComAPIService.getBookings(filters);

      // Log individual bookings to see what we're getting
      if (Array.isArray(data) && data.length > 0) {
      } else {
      }

      if (Array.isArray(data)) {
        let filteredBookings = data;
        const now = new Date();

        // Log all bookings before filtering

        // Server already filters by status correctly, so we only need to sort
        // The server's logic:
        // - "upcoming": endTime >= now AND status not in ["cancelled", "rejected"]
        // - "unconfirmed": endTime >= now AND status = "pending"
        // - "past": endTime <= now AND status not in ["cancelled", "rejected"]
        // - "cancelled": status in ["cancelled", "rejected"]
        switch (activeFilter) {
          case "upcoming":
            // Server already filtered, just sort by start time
            filteredBookings = data.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            break;
          case "unconfirmed":
            // Server already filtered, just sort by start time
            filteredBookings = data.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            break;
          case "past":
            // Server already filtered, sort by start time descending (latest first)
            filteredBookings = data.sort(
              (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
            break;
          case "cancelled":
            // Server already filtered, sort by start time descending (latest first)
            filteredBookings = data.sort(
              (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
            break;
        }

        setBookings(filteredBookings);
        applyFilters(filteredBookings, searchQuery, selectedEventTypeId);
      } else {
        setBookings([]);
        setFilteredBookings([]);
      }
    } catch (err) {
      console.error("🎯 BookingsScreen: Error fetching bookings:", err);
      setError("Failed to load bookings. Please check your API key and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setSearchQuery(""); // Clear search when filter changes
    setSelectedEventTypeId(null); // Clear event type filter when status filter changes
    setSelectedEventTypeLabel(null);
    if (!loading) {
      setLoading(true);
      fetchBookings();
    }
  }, [activeFilter]);

  useEffect(() => {}, [loading, error, bookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const applyFilters = (
    bookingsToFilter: Booking[],
    searchText: string,
    eventTypeId: number | null
  ) => {
    let filtered = bookingsToFilter;

    // Apply event type filter
    if (eventTypeId !== null) {
      filtered = filtered.filter((booking) => booking.eventTypeId === eventTypeId);
    }

    // Apply search filter
    if (searchText.trim() !== "") {
      filtered = filtered.filter(
        (booking) =>
          // Search in booking title
          booking.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          // Search in booking description
          booking.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          // Search in event type title
          booking.eventType?.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          // Search in attendee names
          (booking.attendees &&
            booking.attendees.some((attendee) =>
              attendee.name?.toLowerCase().includes(searchText.toLowerCase())
            )) ||
          // Search in attendee emails
          (booking.attendees &&
            booking.attendees.some((attendee) =>
              attendee.email?.toLowerCase().includes(searchText.toLowerCase())
            )) ||
          // Search in location
          booking.location?.toLowerCase().includes(searchText.toLowerCase()) ||
          // Search in user name
          booking.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          // Search in user email
          booking.user?.email?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(bookings, query, selectedEventTypeId);
  };

  const fetchEventTypes = async () => {
    try {
      setEventTypesLoading(true);
      const types = await CalComAPIService.getEventTypes();
      setEventTypes(types);
    } catch (err) {
      console.error("Error fetching event types:", err);
      setError("Failed to load event types");
    } finally {
      setEventTypesLoading(false);
    }
  };

  const handleFilterButtonPress = () => {
    setActiveModal("FILTER");
    if (eventTypes.length === 0) {
      fetchEventTypes();
    }
  };

  const clearEventTypeFilter = () => {
    setSelectedEventTypeId(null);
    setSelectedEventTypeLabel(null);
    applyFilters(bookings, searchQuery, null);
  };

  const handleEventTypeSelect = (eventTypeId: number | null, label?: string | null) => {
    if (eventTypeId === null) {
      clearEventTypeFilter();
    } else {
      setSelectedEventTypeId(eventTypeId);
      setSelectedEventTypeLabel(label || null);
      applyFilters(bookings, searchQuery, eventTypeId);
    }
    setActiveModal(null);
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
          icon: "calendar-clear-outline",
          title: "No upcoming bookings",
          text: "Your upcoming appointments will appear here",
        };
      case "unconfirmed":
        return {
          icon: "hourglass-outline",
          title: "No unconfirmed bookings",
          text: "Bookings awaiting confirmation will appear here",
        };
      case "past":
        return {
          icon: "archive-outline",
          title: "No past bookings",
          text: "Your completed appointments will appear here",
        };
      case "cancelled":
        return {
          icon: "close-circle-outline",
          title: "No cancelled bookings",
          text: "Cancelled or rejected bookings will appear here",
        };
      default:
        return {
          icon: "calendar-clear-outline",
          title: "No bookings found",
          text: "Your bookings will appear here",
        };
    }
  };

  const renderSegmentedControl = () => {
    return (
      <>
        <View className="border-b border-gray-200 bg-white px-2 py-3 md:px-4">
          <SegmentedControl
            values={filterLabels}
            selectedIndex={activeIndex}
            onChange={handleSegmentChange}
            style={{ height: 40 }}
            appearance="light"
          />
        </View>
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
          {selectedEventTypeId !== null && (
            <View className="mt-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Text className="flex-1 text-sm text-[#333]">
                Filtered by {selectedEventTypeLabel || "event type"}
              </Text>
              <TouchableOpacity onPress={clearEventTypeFilter}>
                <Text className="text-sm font-semibold text-[#007AFF]">Clear filter</Text>
              </TouchableOpacity>
            </View>
          )}
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
              title: "Report booking",
              onPress: () => handleReportBooking(booking),
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
              title: "Reject booking",
              onPress: () => handleRejectBooking(booking),
              destructive: true,
            },
          ];
        case "past":
          return [
            {
              title: "Report booking",
              onPress: () => handleReportBooking(booking),
              destructive: false,
            },
          ];
        case "cancelled":
          return [
            {
              title: "Report booking",
              onPress: () => handleReportBooking(booking),
              destructive: false,
            },
          ];
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
        const supported = await Linking.canOpenURL(booking.location);
        if (supported) {
          await Linking.openURL(booking.location);
        } else {
          Alert.alert("Error", "Cannot open this URL on your device.");
        }
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
          // Fallback to Google Maps web
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            booking.location
          )}`;
          await Linking.openURL(googleMapsUrl);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open location. Please try again.");
    }
  };

  const handleRescheduleBooking = (booking: Booking) => {
    Alert.alert("Reschedule Booking", "Reschedule functionality coming soon");
  };

  const handleRequestReschedule = (booking: Booking) => {
    Alert.alert("Request Reschedule", "Request reschedule functionality coming soon");
  };

  const handleReportBooking = (booking: Booking) => {
    Alert.alert("Report Booking", "Report functionality coming soon");
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
                onPress: async (reason) => {
                  try {
                    const cancellationReason = reason?.trim() || "Event cancelled by host";
                    await CalComAPIService.cancelBooking(booking.uid, cancellationReason);

                    // Remove the cancelled booking from local state or refresh the list
                    if (activeFilter === "upcoming") {
                      // For upcoming bookings, remove from list since it's now cancelled
                      const updatedBookings = bookings.filter((b) => b.uid !== booking.uid);
                      setBookings(updatedBookings);
                      setFilteredBookings(updatedBookings);
                    } else {
                      // For other filters, refresh to get updated data
                      await fetchBookings();
                    }

                    Alert.alert("Success", "Event cancelled successfully");
                  } catch (error) {
                    console.error("Failed to cancel booking:", error);
                    Alert.alert("Error", "Failed to cancel event. Please try again.");
                  }
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
    Alert.alert("Confirm Booking", "Confirm functionality coming soon");
  };

  const handleRejectBooking = (booking: Booking) => {
    Alert.alert("Reject Booking", `Are you sure you want to reject "${booking.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => {
          Alert.alert("Reject Booking", "Reject functionality coming soon");
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

    return (
      <View className="border-b border-[#E5E5EA] bg-white">
        <TouchableOpacity
          className="active:bg-[#F8F9FA]"
          onPress={() => handleBookingPress(item)}
          onLongPress={() => {
            setSelectedBooking(item);
            setActiveModal("ACTIONS");
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
            {isPending && (
              <View className="mb-1 mr-2 rounded bg-[#FF9500] px-2 py-0.5">
                <Text className="text-xs font-medium text-white">Unconfirmed</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text
            className={`mb-2 text-lg font-medium leading-5 text-[#333] ${isCancelled || isRejected ? "line-through" : ""}`}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Description */}
          {item.description && (
            <Text className="mb-2 text-sm leading-5 text-[#666]" numberOfLines={1}>
              "{item.description}"
            </Text>
          )}

          {/* Host and Attendees */}
          {((item.hosts && item.hosts.length > 0) ||
            item.user ||
            (item.attendees && item.attendees.length > 0)) && (
            <Text className="mb-2 text-sm text-[#333]">
              {/* Host */}
              {(item.hosts && item.hosts.length > 0) || item.user ? (
                <>
                  {item.hosts && item.hosts.length > 0
                    ? item.hosts[0].name || item.hosts[0].email
                    : item.user?.name || item.user?.email}
                </>
              ) : null}

              {/* Separator */}
              {((item.hosts && item.hosts.length > 0) || item.user) &&
                item.attendees &&
                item.attendees.length > 0 && <Text> and </Text>}

              {/* Attendees */}
              {item.attendees && item.attendees.length > 0 && (
                <>
                  {item.attendees.length === 1
                    ? item.attendees[0].name || item.attendees[0].email
                    : item.attendees
                        .slice(0, 2)
                        .map((att) => att.name || att.email)
                        .join(", ") +
                      (item.attendees.length > 2 ? ` and ${item.attendees.length - 2} more` : "")}
                </>
              )}
            </Text>
          )}
        </TouchableOpacity>

        {/* Three dots button - below content, aligned to the right */}
        <View className="flex-row justify-end" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <TouchableOpacity
            className="items-center justify-center rounded-lg border border-[#E5E5EA]"
            style={{ width: 32, height: 32 }}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedBooking(item);
              setActiveModal("ACTIONS");
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
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-base text-gray-500">Loading {activeFilter} bookings...</Text>
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
          <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={fetchBookings}>
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (bookings.length === 0 && !loading) {
    const emptyState = getEmptyStateContent();
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        {renderSegmentedControl()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons
            name={emptyState.icon as keyof typeof Ionicons.glyphMap}
            size={64}
            color="#666"
          />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
            {emptyState.title}
          </Text>
          <Text className="text-center text-base text-gray-500">{emptyState.text}</Text>
        </View>
      </View>
    );
  }

  if (filteredBookings.length === 0 && searchQuery.trim() !== "" && !loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        {renderSegmentedControl()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text className="mb-2 mt-4 text-xl font-bold text-gray-800">No results found</Text>
          <Text className="text-center text-base text-gray-500">
            Try searching with different keywords
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f8f9fa]">
      <Header />
      {renderSegmentedControl()}
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

      {/* Filter Modal */}
      <FullScreenModal
        visible={activeModal === "FILTER"}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
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
                    {selectedEventTypeId === eventType.id && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}

                {eventTypes.length === 0 && (
                  <View className="items-center py-4">
                    <Text className="text-sm text-[#666]">No event types found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Booking Actions Modal */}
      <FullScreenModal
        visible={activeModal === "ACTIONS"}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <TouchableOpacity
            className="mx-4 w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="border-b border-gray-200 p-6">
              <Text className="text-center text-xl font-semibold text-gray-900">
                Booking Actions
              </Text>
            </View>

            {/* Actions List */}
            <View className="p-2">
              {/* View Booking */}
              <TouchableOpacity
                onPress={() => {
                  setActiveModal(null);
                  if (selectedBooking) {
                    handleBookingPress(selectedBooking);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="eye-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">View Booking</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Edit event label */}
              <View className="px-4 py-1">
                <Text className="text-xs font-medium text-gray-500">Edit event</Text>
              </View>

              {/* Request Reschedule */}
              {activeFilter === "upcoming" && (
                <TouchableOpacity
                  onPress={() => {
                    setActiveModal(null);
                    if (selectedBooking) {
                      handleRescheduleBooking(selectedBooking);
                    }
                  }}
                  className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                >
                  <Ionicons name="send-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Send Reschedule Request</Text>
                </TouchableOpacity>
              )}

              {/* Edit Location */}
              {activeFilter === "upcoming" && (
                <TouchableOpacity
                  onPress={() => {
                    setActiveModal(null);
                    Alert.alert("Edit Location", "Edit location functionality coming soon");
                  }}
                  className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                >
                  <Ionicons name="location-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Edit Location</Text>
                </TouchableOpacity>
              )}

              {/* Add Guests */}
              {activeFilter === "upcoming" && (
                <TouchableOpacity
                  onPress={() => {
                    setActiveModal(null);
                    Alert.alert("Add Guests", "Add guests functionality coming soon");
                  }}
                  className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                >
                  <Ionicons name="person-add-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Add Guests</Text>
                </TouchableOpacity>
              )}

              {/* Open Location */}
              {selectedBooking?.location && (
                <>
                  <View className="mx-4 my-2 h-px bg-gray-200" />
                  <TouchableOpacity
                    onPress={() => {
                      setActiveModal(null);
                      if (selectedBooking) {
                        handleOpenLocation(selectedBooking);
                      }
                    }}
                    className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                  >
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <Text className="ml-3 text-base text-gray-900">Open Location</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Separator */}
              {(activeFilter === "past" || activeFilter === "upcoming") && (
                <>
                  <View className="mx-4 my-2 h-px bg-gray-200" />

                  {/* After event label */}
                  {activeFilter === "past" && (
                    <View className="px-4 py-1">
                      <Text className="text-xs font-medium text-gray-500">After event</Text>
                    </View>
                  )}

                  {/* Mark as No-Show */}
                  {activeFilter === "past" && (
                    <TouchableOpacity
                      onPress={() => {
                        setActiveModal(null);
                        Alert.alert("Mark as No-Show", "Mark as no-show functionality coming soon");
                      }}
                      className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                    >
                      <Ionicons name="eye-off-outline" size={20} color="#6B7280" />
                      <Text className="ml-3 text-base text-gray-900">Mark as No-Show</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Confirm booking (for unconfirmed) */}
              {activeFilter === "unconfirmed" && (
                <>
                  <View className="mx-4 my-2 h-px bg-gray-200" />
                  <TouchableOpacity
                    onPress={() => {
                      setActiveModal(null);
                      if (selectedBooking) {
                        handleConfirmBooking(selectedBooking);
                      }
                    }}
                    className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                    <Text className="ml-3 text-base text-green-600">Confirm booking</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Report Booking */}
              <TouchableOpacity
                onPress={() => {
                  setActiveModal(null);
                  if (selectedBooking) {
                    handleReportBooking(selectedBooking);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="flag-outline" size={20} color="#EF4444" />
                <Text className="ml-3 text-base text-red-500">Report Booking</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Cancel/Reject Booking */}
              {(activeFilter === "upcoming" || activeFilter === "unconfirmed") && (
                <TouchableOpacity
                  onPress={() => {
                    setActiveModal(null);
                    if (selectedBooking) {
                      if (activeFilter === "unconfirmed") {
                        handleRejectBooking(selectedBooking);
                      } else {
                        handleCancelEvent(selectedBooking);
                      }
                    }
                  }}
                  className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                >
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  <Text className="ml-3 text-base text-red-500">
                    {activeFilter === "unconfirmed" ? "Reject booking" : "Cancel event"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel button */}
            <View className="border-t border-gray-200 p-2 md:p-4">
              <TouchableOpacity
                className="w-full rounded-lg bg-gray-100 p-3"
                onPress={() => setActiveModal(null)}
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>
    </View>
  );
}