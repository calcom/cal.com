import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { Activity, useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl, ScrollView, Alert } from "react-native";

import type { Booking, EventType } from "../../services/calcom";
import { LoadingSpinner } from "../LoadingSpinner";
import { EmptyScreen } from "../EmptyScreen";
import { BookingListItem } from "../booking-list-item/BookingListItem";
import { BookingModals } from "../booking-modals/BookingModals";
import { useAuth } from "../../contexts/AuthContext";
import {
  useBookings,
  useCancelBooking,
  useConfirmBooking,
  useDeclineBooking,
  useRescheduleBooking,
  useBookingActions,
  type BookingFilter,
} from "../../hooks";
import { offlineAwareRefresh } from "../../utils/network";
import {
  getEmptyStateContent,
  groupBookingsByMonth,
  searchBookings,
  filterByEventType,
} from "../../utils/bookings-utils";
import type { ListItem } from "../../utils/bookings-utils";

interface BookingListScreenProps {
  // Platform-specific header rendering
  renderHeader?: () => React.ReactNode;

  // Platform-specific filter controls
  renderFilterControls?: () => React.ReactNode;

  // Whether to show the filter modal (only for non-iOS)
  showFilterModal?: boolean;
  setShowFilterModal?: (show: boolean) => void;

  // Event types for filtering
  eventTypes?: EventType[];
  eventTypesLoading?: boolean;

  // Search query (controlled from parent for iOS headerSearchBar)
  searchQuery: string;
  onSearchChange?: (query: string) => void;

  // Event type filter (controlled from parent)
  selectedEventTypeId: number | null;
  onEventTypeChange?: (id: number | null, label?: string | null) => void;

  // Active filter (controlled from parent)
  activeFilter: BookingFilter;
  filterParams: Record<string, unknown>;

  // iOS-style list (no wrapper)
  iosStyle?: boolean;
}

export const BookingListScreen: React.FC<BookingListScreenProps> = ({
  renderHeader,
  renderFilterControls,
  showFilterModal,
  setShowFilterModal,
  eventTypes,
  eventTypesLoading,
  searchQuery,
  selectedEventTypeId,
  onEventTypeChange,
  activeFilter,
  filterParams,
  iosStyle = false,
}) => {
  const router = useRouter();
  const { userInfo } = useAuth();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Use React Query hook for fetching bookings
  const {
    data: rawBookings = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useBookings(filterParams);

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

  // Booking actions hook
  const {
    showRescheduleModal,
    rescheduleBooking,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTime,
    setRescheduleTime,
    rescheduleReason,
    setRescheduleReason,
    showRejectModal,
    rejectReason,
    setRejectReason,
    selectedBooking,
    setSelectedBooking,
    handleBookingPress,
    handleRescheduleBooking,
    handleSubmitReschedule,
    handleCloseRescheduleModal,
    handleCancelBooking,
    handleInlineConfirm,
    handleOpenRejectModal,
    handleSubmitReject,
    handleCloseRejectModal,
  } = useBookingActions({
    router,
    cancelMutation: cancelBookingMutation,
    confirmMutation: confirmBookingMutation,
    declineMutation: declineBookingMutation,
    rescheduleMutation: rescheduleBookingMutation,
    isConfirming,
    isDeclining,
    isRescheduling,
  });

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

  // Prevents showing loading indicator when refreshing or changing filters
  function manualRefresh() {
    setIsManualRefreshing(true);
    offlineAwareRefresh(refetch).finally(() => {
      setIsManualRefreshing(false);
    });
  }

  // Apply local filters (search and event type) using useMemo
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Apply event type filter
    filtered = filterByEventType(filtered, selectedEventTypeId);

    // Apply search filter
    filtered = searchBookings(filtered, searchQuery);

    return filtered;
  }, [bookings, searchQuery, selectedEventTypeId]);

  const [showBookingActionsModal, setShowBookingActionsModal] = React.useState(false);

  const renderBookingItem = ({ item }: { item: Booking }) => {
    return (
      <BookingListItem
        booking={item}
        userEmail={userInfo?.email}
        isConfirming={isConfirming}
        isDeclining={isDeclining}
        onPress={handleBookingPress}
        onLongPress={(booking) => {
          setSelectedBooking(booking);
          setShowBookingActionsModal(true);
        }}
        onConfirm={handleInlineConfirm}
        onReject={handleOpenRejectModal}
        onActionsPress={(booking) => {
          setSelectedBooking(booking);
          setShowBookingActionsModal(true);
        }}
        // iOS context menu action handlers
        onReschedule={handleRescheduleBooking}
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
        onCancelBooking={handleCancelBooking}
      />
    );
  };

  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === "monthHeader") {
      return (
        <View className="border-b border-[#E5E5EA] bg-[#f1f1f1] px-2 py-3 md:px-4">
          <Text className="text-base font-bold text-[#333]">{item.monthYear}</Text>
        </View>
      );
    }
    return renderBookingItem({ item: item.booking });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        {renderHeader?.()}
        {renderFilterControls?.()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        {renderHeader?.()}
        {renderFilterControls?.()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
            Unable to load bookings
          </Text>
          <Text className="mb-6 text-center text-base text-gray-500">{error}</Text>
        </View>
      </View>
    );
  }

  // Determine what content to show
  const showEmptyState = bookings.length === 0 && !loading;
  const showSearchEmptyState =
    filteredBookings.length === 0 && searchQuery.trim() !== "" && !loading && !showEmptyState;
  const showList = !showEmptyState && !showSearchEmptyState && !loading;
  const emptyState = getEmptyStateContent(activeFilter);

  return (
    <>
      {renderHeader?.()}
      {renderFilterControls?.()}

      {/* Empty state - no bookings */}
      <Activity mode={showEmptyState ? "visible" : "hidden"}>
        <View className="flex-1 bg-gray-50">
          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
            refreshControl={
              <RefreshControl refreshing={isManualRefreshing} onRefresh={manualRefresh} />
            }
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: "white" }}
          >
            <EmptyScreen
              icon={emptyState.icon}
              headline={emptyState.title}
              description={emptyState.text}
            />
          </ScrollView>
        </View>
      </Activity>

      {/* Search empty state */}
      <Activity mode={showSearchEmptyState ? "visible" : "hidden"}>
        <View className="flex-1 bg-gray-50">
          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
            refreshControl={
              <RefreshControl refreshing={isManualRefreshing} onRefresh={manualRefresh} />
            }
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: "white" }}
          >
            <EmptyScreen
              icon="search-outline"
              headline={`No results found for "${searchQuery}"`}
              description="Try searching with different keywords"
            />
          </ScrollView>
        </View>
      </Activity>

      {/* Bookings list */}
      <Activity mode={showList ? "visible" : "hidden"}>
        <Activity mode={iosStyle ? "visible" : "hidden"}>
          <FlatList
            data={groupBookingsByMonth(filteredBookings)}
            keyExtractor={(item) => item.key}
            renderItem={renderListItem}
            contentContainerStyle={{ paddingBottom: 90 }}
            refreshControl={
              <RefreshControl refreshing={isManualRefreshing} onRefresh={manualRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: "white" }}
          />
        </Activity>

        <Activity mode={!iosStyle ? "visible" : "hidden"}>
          <View className="flex-1 px-2 pt-4 md:px-4">
            <View className="flex-1 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
              <FlatList
                data={groupBookingsByMonth(filteredBookings)}
                keyExtractor={(item) => item.key}
                renderItem={renderListItem}
                contentContainerStyle={{ paddingBottom: 90 }}
                refreshControl={
                  <RefreshControl refreshing={isManualRefreshing} onRefresh={manualRefresh} />
                }
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Activity>
      </Activity>

      {/* Modals */}
      <BookingModals
        showRescheduleModal={showRescheduleModal}
        rescheduleBooking={rescheduleBooking}
        rescheduleDate={rescheduleDate}
        rescheduleTime={rescheduleTime}
        rescheduleReason={rescheduleReason}
        isRescheduling={isRescheduling}
        onRescheduleClose={handleCloseRescheduleModal}
        onRescheduleSubmit={handleSubmitReschedule}
        onRescheduleDateChange={setRescheduleDate}
        onRescheduleTimeChange={setRescheduleTime}
        onRescheduleReasonChange={setRescheduleReason}
        showRejectModal={showRejectModal}
        rejectReason={rejectReason}
        isDeclining={isDeclining}
        onRejectClose={handleCloseRejectModal}
        onRejectSubmit={handleSubmitReject}
        onRejectReasonChange={setRejectReason}
        showFilterModal={showFilterModal}
        eventTypes={eventTypes}
        eventTypesLoading={eventTypesLoading}
        selectedEventTypeId={selectedEventTypeId}
        onFilterClose={() => setShowFilterModal?.(false)}
        onEventTypeSelect={onEventTypeChange}
        showBookingActionsModal={showBookingActionsModal}
        selectedBooking={selectedBooking}
        onActionsClose={() => setShowBookingActionsModal(false)}
        onReschedule={() => {
          if (selectedBooking) handleRescheduleBooking(selectedBooking);
        }}
        onCancel={() => {
          if (selectedBooking) handleCancelBooking(selectedBooking);
        }}
      />
    </>
  );
};
