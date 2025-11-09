import { Ionicons } from "@expo/vector-icons";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";

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
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];

    // Calculate a wider date range for past and cancelled bookings
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoISO = sixMonthsAgo.toISOString().split("T")[0];

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

  const handleSegmentChange = (event: any) => {
    const selectedIndex = event.nativeEvent.selectedSegmentIndex;
    const selectedFilter = filterOptions[selectedIndex];
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
      <View style={styles.segmentedControlContainer}>
        <SegmentedControl
          values={filterLabels}
          selectedIndex={activeIndex}
          onChange={handleSegmentChange}
          style={styles.segmentedControl}
        />
      </View>
    );
  };

  const handleBookingPress = (booking: Booking) => {
    const attendeesList = booking.attendees?.map((att) => att.name).join(", ") || "No attendees";
    Alert.alert(
      booking.title,
      `${booking.description || "No description"}\n\nTime: ${formatDateTime(
        booking.startTime
      )} - ${formatTime(booking.endTime)}\nAttendees: ${attendeesList}\nStatus: ${booking.status}${
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
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
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
    <TouchableOpacity style={styles.bookingCard} onPress={() => handleBookingPress(item)}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{formatStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.bookingInfo}>
        <View style={styles.dateTimeSection}>
          <Text style={styles.dateText}>{formatDate(item.startTime)}</Text>
          <Text style={styles.timeText}>
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </Text>
        </View>
      </View>

      {item.attendees && item.attendees.length > 0 && (
        <View style={styles.attendeesSection}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.attendeesText}>{item.attendees.map((att) => att.name).join(", ")}</Text>
        </View>
      )}

      {item.location && (
        <View style={styles.locationSection}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      )}

      <View style={styles.bookingFooter}>
        <Text style={styles.eventTypeText}>{item.eventType?.title || "Event"}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderSegmentedControl()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading {activeFilter} bookings...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderSegmentedControl()}
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Unable to load bookings</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (bookings.length === 0 && !loading) {
    const emptyState = getEmptyStateContent();
    return (
      <View style={styles.container}>
        {renderSegmentedControl()}
        <View style={styles.centerContainer}>
          <Ionicons name={emptyState.icon as any} size={64} color="#666" />
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyText}>{emptyState.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSegmentedControl()}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  segmentedControlContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  segmentedControl: {
    height: 36,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  listContainer: {
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  bookingInfo: {
    marginBottom: 12,
  },
  dateTimeSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  attendeesSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  attendeesText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  locationSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  eventTypeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
});