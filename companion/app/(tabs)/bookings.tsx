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
  TextInput,
  ActionSheetIOS,
  Linking,
} from "react-native";

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
      <>
        <View style={styles.segmentedControlContainer}>
          <SegmentedControl
            values={filterLabels}
            selectedIndex={activeIndex}
            onChange={handleSegmentChange}
            style={styles.segmentedControl}
          />
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
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
        style: action.destructive ? "destructive" : "default",
        onPress: action.onPress,
      }));
      alertActions.unshift({ text: "Cancel", style: "cancel", onPress: () => {} });

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
    <TouchableOpacity style={styles.bookingCard} onPress={() => handleBookingPress(item)}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{formatStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.bookingInfo}>
        <View style={styles.dateTimeSection}>
          <Text style={styles.dateText}>{formatDate(item.start || item.startTime || "")}</Text>
          <Text style={styles.timeText}>
            {formatTime(item.start || item.startTime || "")} - {formatTime(item.end || item.endTime || "")}
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

  if (filteredBookings.length === 0 && searchQuery.trim() !== "" && !loading) {
    return (
      <View style={styles.container}>
        {renderSegmentedControl()}
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>Try searching with different keywords</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSegmentedControl()}
      <FlatList
        data={filteredBookings}
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
    paddingTop: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  segmentedControl: {
    height: 36,
  },
  searchContainer: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#C6C6C8",
  },
  searchBar: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 17,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
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
    paddingBottom: 90,
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
