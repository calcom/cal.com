import { Ionicons } from "@expo/vector-icons";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
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
} from "react-native";
import type { NativeSyntheticEvent } from "react-native";

import { CalComAPIService, Booking } from "../../services/calcom";

type BookingFilter = "upcoming" | "unconfirmed" | "past" | "cancelled";

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("upcoming");

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
        setFilteredBookings(filteredBookings);
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredBookings(bookings);
    } else {
      const filtered = bookings.filter(
        (booking) =>
          // Search in booking title
          booking.title?.toLowerCase().includes(query.toLowerCase()) ||
          // Search in booking description
          booking.description?.toLowerCase().includes(query.toLowerCase()) ||
          // Search in event type title
          booking.eventType?.title?.toLowerCase().includes(query.toLowerCase()) ||
          // Search in attendee names
          (booking.attendees &&
            booking.attendees.some((attendee) =>
              attendee.name?.toLowerCase().includes(query.toLowerCase())
            )) ||
          // Search in attendee emails
          (booking.attendees &&
            booking.attendees.some((attendee) =>
              attendee.email?.toLowerCase().includes(query.toLowerCase())
            )) ||
          // Search in location
          booking.location?.toLowerCase().includes(query.toLowerCase()) ||
          // Search in user name
          booking.user?.name?.toLowerCase().includes(query.toLowerCase()) ||
          // Search in user email
          booking.user?.email?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredBookings(filtered);
    }
  };

  const handleFilterChange = (filter: BookingFilter) => {
    setActiveFilter(filter);
  };

  const handleSegmentChange = (
    event: NativeSyntheticEvent<{ selectedSegmentIndex: number }>
  ) => {
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
        <View className="bg-white px-4 py-3 pt-16 border-b border-gray-200">
          <SegmentedControl
            values={filterLabels}
            selectedIndex={activeIndex}
            onChange={handleSegmentChange}
            className="h-9"
          />
        </View>
        <View className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <TextInput
            className="bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200"
            placeholder="Search bookings"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </>
    );
  };

  const handleBookingPress = (booking: Booking) => {
    if (Platform.OS !== "ios") {
      // Fallback for non-iOS platforms
      const attendeesList = booking.attendees?.map((att) => att.name).join(", ") || "No attendees";
      const startTime = booking.start || booking.startTime || "";
      const endTime = booking.end || booking.endTime || "";

      const actions = getBookingActions(booking);
      const alertActions = actions.map((action) => ({
        text: action.title,
        style: (action.destructive ? "destructive" : "default") as "destructive" | "default" | "cancel",
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
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex + 1 : undefined,
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

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "";
      }
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
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

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      className="mb-3 rounded-xl bg-white p-4 shadow-md"
      onPress={() => handleBookingPress(item)}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="mr-2 flex-1 text-lg font-semibold text-gray-800">{item.title}</Text>
        <View
          className="rounded-md px-2 py-1"
          style={{ backgroundColor: getStatusColor(item.status) }}
        >
          <Text className="text-xs font-semibold text-white">{formatStatusText(item.status)}</Text>
        </View>
      </View>

      <View className="mb-3">
        <View className="flex-row items-center">
          <Text className="mr-3 text-base font-medium text-gray-800">
            {formatDate(item.start || item.startTime || "")}
          </Text>
          <Text className="text-sm text-gray-500">
            {formatTime(item.start || item.startTime || "")} - {formatTime(item.end || item.endTime || "")}
          </Text>
        </View>
      </View>

      {item.attendees && item.attendees.length > 0 && (
        <View className="mb-2 flex-row items-center">
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text className="ml-2 flex-1 text-sm text-gray-500">
            {item.attendees.map((att) => att.name).join(", ")}
          </Text>
        </View>
      )}

      {item.location && (
        <View className="mb-2 flex-row items-center">
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text className="ml-2 flex-1 text-sm text-gray-500">{item.location}</Text>
        </View>
      )}

      <View className="mt-2 flex-row items-center justify-between border-t border-gray-100 pt-2">
        <Text className="text-sm font-medium text-gray-700">{item.eventType?.title || "Event"}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
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
        {renderSegmentedControl()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text className="mt-4 mb-2 text-center text-xl font-bold text-gray-800">
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
        {renderSegmentedControl()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name={emptyState.icon as keyof typeof Ionicons.glyphMap} size={64} color="#666" />
          <Text className="mt-4 mb-2 text-center text-xl font-bold text-gray-800">
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
        {renderSegmentedControl()}
        <View className="flex-1 justify-center items-center p-5 bg-gray-50">
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text className="text-xl font-bold mt-4 mb-2 text-gray-800">No results found</Text>
          <Text className="text-base text-gray-500 text-center">Try searching with different keywords</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {renderSegmentedControl()}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBooking}
        className="px-4 py-4"
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
