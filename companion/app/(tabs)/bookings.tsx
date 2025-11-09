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
} from "react-native";
import type { NativeSyntheticEvent } from "react-native";

import { CalComAPIService, Booking } from "../../services/calcom";

type BookingFilter = "upcoming" | "unconfirmed" | "past" | "cancelled";

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
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
      console.log("🎯 BookingsScreen: Starting fetch for filter:", activeFilter);
      setError(null);

      // First, test the raw bookings API call (only on first load)
      if (loading) {
        await CalComAPIService.testRawBookingsAPI();
      }

      const filters = getFiltersForActiveTab();
      console.log("🎯 BookingsScreen: Using filters:", filters);

      const data = await CalComAPIService.getBookings(filters);

      console.log("🎯 BookingsScreen: Raw data received for", activeFilter, ":", data);
      console.log("🎯 BookingsScreen: Data type:", typeof data);
      console.log("🎯 BookingsScreen: Data is array:", Array.isArray(data));
      console.log("🎯 BookingsScreen: Data length:", data?.length);

      // Log individual bookings to see what we're getting
      if (Array.isArray(data) && data.length > 0) {
        console.log(
          "🎯 BookingsScreen: First few bookings for",
          activeFilter,
          ":",
          data.slice(0, 3).map((b) => ({
            title: b.title,
            status: b.status,
            startTime: b.startTime,
            endTime: b.endTime,
          }))
        );
      } else {
        console.log("🎯 BookingsScreen: No data returned from API for", activeFilter);
      }

      if (Array.isArray(data)) {
        let filteredBookings = data;
        const now = new Date();

        // Log all bookings before filtering
        console.log(
          "🎯 BookingsScreen: All bookings before client filtering for",
          activeFilter,
          ":",
          data.map((b) => ({
            title: b.title,
            status: b.status,
            startTime: b.startTime,
            endTime: b.endTime,
            isPast: new Date(b.endTime) < now,
          }))
        );

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

        console.log(
          "🎯 BookingsScreen: After client filtering for",
          activeFilter,
          ":",
          filteredBookings.length,
          "bookings"
        );

        setBookings(filteredBookings);
        console.log(
          "🎯 BookingsScreen: State updated with",
          filteredBookings.length,
          activeFilter,
          "bookings"
        );
      } else {
        console.log("🎯 BookingsScreen: Data is not an array, setting empty array");
        setBookings([]);
      }
    } catch (err) {
      console.error("🎯 BookingsScreen: Error fetching bookings:", err);
      setError("Failed to load bookings. Please check your API key and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("🎯 BookingsScreen: Fetch completed, loading set to false");
    }
  };

  useEffect(() => {
    console.log("🎯 BookingsScreen: Component mounted, starting fetch...");
    fetchBookings();
  }, []);

  useEffect(() => {
    console.log("🎯 BookingsScreen: Filter changed to:", activeFilter);
    if (!loading) {
      setLoading(true);
      fetchBookings();
    }
  }, [activeFilter]);

  useEffect(() => {
    console.log(
      "🎯 BookingsScreen: State changed - loading:",
      loading,
      "error:",
      error,
      "bookings count:",
      bookings.length
    );
  }, [loading, error, bookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
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

  const renderSegmentedControl = () => (
    <View className="border-b border-gray-200 bg-white px-4 py-3">
      <SegmentedControl
        values={filterLabels}
        selectedIndex={activeIndex}
        onChange={handleSegmentChange}
        style={{ height: 36 }}
      />
    </View>
  );

  const handleBookingPress = (booking: Booking) => {
    const attendeesList = booking.attendees?.map((att) => att.name).join(", ") || "No attendees";
    const startTime = booking.start || booking.startTime || "";
    const endTime = booking.end || booking.endTime || "";
    Alert.alert(
      booking.title,
      `${booking.description || "No description"}\n\nTime: ${formatDateTime(startTime)} - ${formatTime(
        endTime
      )}\nAttendees: ${attendeesList}\nStatus: ${booking.status}${
        booking.location ? `\nLocation: ${booking.location}` : ""
      }`,
      [{ text: "OK" }]
    );
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

  return (
    <View className="flex-1 bg-gray-50">
      {renderSegmentedControl()}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBooking}
        className="px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
