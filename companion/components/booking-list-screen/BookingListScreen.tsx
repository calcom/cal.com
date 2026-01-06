import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { Activity, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { BookingListItem } from "@/components/booking-list-item/BookingListItem";
import { BookingModals } from "@/components/booking-modals/BookingModals";
import { EmptyScreen } from "@/components/EmptyScreen";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Text as UIText } from "@/components/ui/text";
import { useAuth } from "@/contexts/AuthContext";
import {
  type BookingFilter,
  useBookingActions,
  useBookings,
  useCancelBooking,
  useConfirmBooking,
  useDeclineBooking,
  useRescheduleBooking,
} from "@/hooks";
import type { Booking, EventType } from "@/services/calcom";
import type { ListItem } from "@/utils/bookings-utils";
import {
  filterByEventType,
  getEmptyStateContent,
  groupBookingsByMonth,
  searchBookings,
} from "@/utils/bookings-utils";
import { offlineAwareRefresh } from "@/utils/network";

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
    error: queryError,
    refetch,
  } = useBookings(filterParams);

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
    showRejectModal,
    rejectReason,
    setRejectReason,
    showCancelModal,
    cancelReason,
    setCancelReason,
    handleSubmitCancel,
    handleCloseCancelModal,
    selectedBooking,
    setSelectedBooking,
    handleBookingPress,
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

  // Navigate to reschedule screen (same pattern as booking detail)
  const handleNavigateToReschedule = React.useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/reschedule",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  // Navigate to edit location screen (same pattern as booking detail)
  const handleNavigateToEditLocation = React.useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/edit-location",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  // Navigate to add guests screen (same pattern as booking detail)
  const handleNavigateToAddGuests = React.useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/add-guests",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  // Navigate to mark no show screen (same pattern as booking detail)
  const handleNavigateToMarkNoShow = React.useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/mark-no-show",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  // Navigate to view recordings screen (same pattern as booking detail)
  const handleNavigateToViewRecordings = React.useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/view-recordings",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  // Navigate to meeting session details screen (same pattern as booking detail)
  const handleNavigateToMeetingSessionDetails = React.useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/meeting-session-details",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

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
        // iOS context menu action handlers - now use screen navigation
        onReschedule={handleNavigateToReschedule}
        onEditLocation={handleNavigateToEditLocation}
        onAddGuests={handleNavigateToAddGuests}
        onViewRecordings={handleNavigateToViewRecordings}
        onMeetingSessionDetails={handleNavigateToMeetingSessionDetails}
        onMarkNoShow={handleNavigateToMarkNoShow}
        onReportBooking={() => {
          Alert.alert("Report Booking", "Report booking functionality is not yet available");
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
          <Ionicons name="alert-circle" size={64} color="#800020" />
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
        showRescheduleModal={false}
        rescheduleBooking={null}
        isRescheduling={isRescheduling}
        onRescheduleClose={() => {}}
        onRescheduleSubmit={async () => {}}
        showRejectModal={showRejectModal}
        rejectReason={rejectReason}
        isDeclining={isDeclining}
        onRejectClose={handleCloseRejectModal}
        currentUserEmail={userInfo?.email}
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
          // Navigate to reschedule screen instead of opening modal
          if (selectedBooking) {
            setShowBookingActionsModal(false);
            handleNavigateToReschedule(selectedBooking);
          }
        }}
        onCancel={() => {
          if (selectedBooking) handleCancelBooking(selectedBooking);
        }}
        onEditLocation={(booking) => {
          // Navigate to edit location screen instead of opening modal
          setShowBookingActionsModal(false);
          handleNavigateToEditLocation(booking);
        }}
        onAddGuests={(booking) => {
          // Navigate to add guests screen instead of opening modal
          setShowBookingActionsModal(false);
          handleNavigateToAddGuests(booking);
        }}
        onViewRecordings={(booking) => {
          // Navigate to view recordings screen instead of opening modal
          setShowBookingActionsModal(false);
          handleNavigateToViewRecordings(booking);
        }}
        onMeetingSessionDetails={(booking) => {
          // Navigate to meeting session details screen instead of opening modal
          setShowBookingActionsModal(false);
          handleNavigateToMeetingSessionDetails(booking);
        }}
        onMarkNoShow={(booking) => {
          // Navigate to mark no show screen instead of opening modal
          setShowBookingActionsModal(false);
          handleNavigateToMarkNoShow(booking);
        }}
      />

      {/* Cancel Event AlertDialog for Android */}
      {Platform.OS === "android" && (
        <AlertDialog open={showCancelModal} onOpenChange={handleCloseCancelModal}>
          <AlertDialogContent>
            <AlertDialogHeader className="items-start">
              <AlertDialogTitle>
                <UIText className="text-left text-lg font-semibold">Cancel event</UIText>
              </AlertDialogTitle>
              <AlertDialogDescription>
                <UIText className="text-left text-sm text-muted-foreground">
                  Cancellation reason will be shared with guests
                </UIText>
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Reason Input */}
            <View>
              <UIText className="mb-2 text-sm font-medium">Reason for cancellation</UIText>
              <TextInput
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2.5 text-base text-[#111827]"
                placeholder="Why are you cancelling?"
                placeholderTextColor="#9CA3AF"
                value={cancelReason}
                onChangeText={setCancelReason}
                autoFocus
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </View>

            <AlertDialogFooter>
              <AlertDialogCancel onPress={handleCloseCancelModal}>
                <UIText>Nevermind</UIText>
              </AlertDialogCancel>
              <AlertDialogAction onPress={handleSubmitCancel}>
                <UIText className="text-white">Cancel event</UIText>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
