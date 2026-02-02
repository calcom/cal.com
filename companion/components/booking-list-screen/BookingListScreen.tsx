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
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { FullScreenModal } from "@/components/FullScreenModal";
import { BookingListItem } from "@/components/booking-list-item/BookingListItem";
import { BookingListSkeleton } from "@/components/booking-list-item/BookingListItemSkeleton";
import { RecurringBookingListItem } from "@/components/booking-list-item/RecurringBookingListItem";
import { BookingModals } from "@/components/booking-modals/BookingModals";
import { EmptyScreen } from "@/components/EmptyScreen";
import { showErrorAlert, showInfoAlert, showSuccessAlert } from "@/utils/alerts";
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
import type { ListItem, RecurringBookingGroup } from "@/utils/bookings-utils";
import {
  filterByEventType,
  getEmptyStateContent,
  groupBookingsByMonth,
  groupRecurringBookings,
  searchBookings,
} from "@/utils/bookings-utils";
import { offlineAwareRefresh } from "@/utils/network";
import { getColors } from "@/constants/colors";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

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
    cancelBooking,
    cancelReason,
    setCancelReason,
    handleSubmitCancel,
    handleCloseCancelModal,
    selectedBooking,
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

  // Generate list items based on filter type
  const listItems = useMemo<ListItem[]>(() => {
    if (activeFilter === "recurring") {
      // For recurring filter, group bookings by recurringBookingUid
      const groups = groupRecurringBookings(filteredBookings);
      return groups.map((group) => ({
        type: "recurringGroup" as const,
        group,
        key: `recurring-${group.recurringBookingUid}`,
      }));
    }

    if (activeFilter === "unconfirmed") {
      // For unconfirmed filter, group recurring bookings but keep non-recurring separate
      const recurringBookings: Booking[] = [];
      const nonRecurringBookings: Booking[] = [];

      filteredBookings.forEach((booking) => {
        if (booking.recurringBookingUid) {
          recurringBookings.push(booking);
        } else {
          nonRecurringBookings.push(booking);
        }
      });

      // Group recurring bookings
      const recurringGroups = groupRecurringBookings(recurringBookings);
      const recurringItems: ListItem[] = recurringGroups.map((group) => ({
        type: "recurringGroup" as const,
        group,
        key: `recurring-${group.recurringBookingUid}`,
      }));

      // Keep non-recurring bookings with month grouping
      const nonRecurringItems = groupBookingsByMonth(nonRecurringBookings);

      // Combine: recurring groups first, then non-recurring
      return [...recurringItems, ...nonRecurringItems];
    }

    // For other filters, use month grouping
    return groupBookingsByMonth(filteredBookings);
  }, [filteredBookings, activeFilter]);

  // State for bulk action loading
  const [isCancellingAll, setIsCancellingAll] = React.useState(false);
  const [isConfirmingAll, setIsConfirmingAll] = React.useState(false);
  const [isDecliningAll, setIsDecliningAll] = React.useState(false);

  // Android dialog state for Cancel All
  const [showCancelAllDialog, setShowCancelAllDialog] = React.useState(false);
  const [cancelAllGroup, setCancelAllGroup] = React.useState<RecurringBookingGroup | null>(null);
  const [cancelAllReason, setCancelAllReason] = React.useState("");

  // Android dialog state for Reject All
  const [showRejectAllDialog, setShowRejectAllDialog] = React.useState(false);
  const [rejectAllGroup, setRejectAllGroup] = React.useState<RecurringBookingGroup | null>(null);
  const [rejectAllReason, setRejectAllReason] = React.useState("");

  // Handle recurring group press - navigate to first upcoming booking
  const handleRecurringGroupPress = React.useCallback(
    (group: RecurringBookingGroup) => {
      handleBookingPress(group.firstUpcoming);
    },
    [handleBookingPress]
  );

  // Cancel all remaining bookings in a recurring series
  const handleCancelAllRemaining = React.useCallback(
    async (group: RecurringBookingGroup) => {
      // For Android, open dialog with reason input
      if (Platform.OS === "android") {
        setCancelAllGroup(group);
        setCancelAllReason("");
        setShowCancelAllDialog(true);
        return;
      }

      // For iOS, use Alert.prompt
      Alert.alert(
        "Cancel All Remaining",
        `Are you sure you want to cancel all ${group.remainingCount} remaining bookings in this series?`,
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel All",
            style: "destructive",
            onPress: () => {
              Alert.prompt(
                "Cancellation Reason",
                "Please provide a reason for cancelling these bookings:",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Cancel All",
                    style: "destructive",
                    onPress: (reason?: string) => {
                      const cancellationReason = reason?.trim() || "Cancelled all remaining";
                      setIsCancellingAll(true);
                      cancelBookingMutation(
                        {
                          uid: group.recurringBookingUid,
                          reason: cancellationReason,
                        },
                        {
                          onSuccess: () => {
                            showSuccessAlert(
                              "Success",
                              "All remaining bookings have been cancelled."
                            );
                            setIsCancellingAll(false);
                          },
                          onError: () => {
                            showErrorAlert("Error", "Failed to cancel bookings. Please try again.");
                            setIsCancellingAll(false);
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
        ]
      );
    },
    [cancelBookingMutation]
  );

  // Confirm all unconfirmed bookings in a recurring series
  const handleConfirmAll = React.useCallback(
    async (group: RecurringBookingGroup) => {
      const unconfirmedBookings = group.bookings.filter(
        (b) =>
          b.status?.toLowerCase() === "pending" ||
          b.status?.toLowerCase() === "requires_confirmation" ||
          b.requiresConfirmation
      );

      if (unconfirmedBookings.length === 0) {
        showInfoAlert("Info", "No unconfirmed bookings to confirm.");
        return;
      }

      Alert.alert(
        "Confirm All",
        `Are you sure you want to confirm ${unconfirmedBookings.length} unconfirmed bookings?`,
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Confirm All",
            onPress: async () => {
              setIsConfirmingAll(true);
              let successCount = 0;
              let errorCount = 0;

              for (const booking of unconfirmedBookings) {
                try {
                  const success = await new Promise<boolean>((resolve, _reject) => {
                    confirmBookingMutation(
                      { uid: booking.uid },
                      {
                        onSuccess: () => {
                          resolve(true);
                        },
                        onError: () => {
                          resolve(false); // Continue even on error
                        },
                      }
                    );
                  });
                  if (success) {
                    successCount++;
                  } else {
                    errorCount++;
                  }
                } catch {
                  errorCount++;
                }
              }

              setIsConfirmingAll(false);
              if (errorCount > 0) {
                showInfoAlert(
                  "Partial Success",
                  `Confirmed ${successCount} bookings. Failed to confirm ${errorCount}.`
                );
              } else {
                showSuccessAlert("Success", `All ${successCount} bookings have been confirmed.`);
              }
            },
          },
        ]
      );
    },
    [confirmBookingMutation]
  );

  // Reject all unconfirmed bookings in a recurring series
  const handleRejectAll = React.useCallback(
    async (group: RecurringBookingGroup) => {
      const unconfirmedBookings = group.bookings.filter(
        (b) =>
          b.status?.toLowerCase() === "pending" ||
          b.status?.toLowerCase() === "requires_confirmation" ||
          b.requiresConfirmation
      );

      if (unconfirmedBookings.length === 0) {
        showInfoAlert("Info", "No unconfirmed bookings to reject.");
        return;
      }

      // For Android, open dialog with reason input
      if (Platform.OS === "android") {
        setRejectAllGroup(group);
        setRejectAllReason("");
        setShowRejectAllDialog(true);
        return;
      }

      // For iOS, use Alert.prompt
      Alert.alert(
        "Reject All",
        `Are you sure you want to reject ${unconfirmedBookings.length} unconfirmed bookings?`,
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Reject All",
            style: "destructive",
            onPress: () => {
              Alert.prompt(
                "Rejection Reason",
                "Optionally provide a reason for rejecting (press OK to skip):",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "OK",
                    onPress: async (reason?: string) => {
                      setIsDecliningAll(true);
                      let successCount = 0;
                      let errorCount = 0;

                      for (const booking of unconfirmedBookings) {
                        try {
                          const success = await new Promise<boolean>((resolve, _reject) => {
                            declineBookingMutation(
                              {
                                uid: booking.uid,
                                reason: reason || undefined,
                              },
                              {
                                onSuccess: () => {
                                  resolve(true);
                                },
                                onError: () => {
                                  resolve(false);
                                },
                              }
                            );
                          });

                          if (success) {
                            successCount++;
                          } else {
                            errorCount++;
                          }
                        } catch {
                          errorCount++;
                        }
                      }

                      setIsDecliningAll(false);
                      if (errorCount > 0) {
                        showInfoAlert(
                          "Partial Success",
                          `Rejected ${successCount} bookings. Failed to reject ${errorCount}.`
                        );
                      } else {
                        showSuccessAlert(
                          "Success",
                          `All ${successCount} bookings have been rejected.`
                        );
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
        ]
      );
    },
    [declineBookingMutation]
  );

  const renderBookingItem = ({ item }: { item: Booking }) => {
    return (
      <BookingListItem
        booking={item}
        userEmail={userInfo?.email}
        isConfirming={isConfirming}
        isDeclining={isDeclining}
        onPress={handleBookingPress}
        onConfirm={handleInlineConfirm}
        onReject={handleOpenRejectModal}
        onReschedule={handleNavigateToReschedule}
        onEditLocation={handleNavigateToEditLocation}
        onAddGuests={handleNavigateToAddGuests}
        onViewRecordings={handleNavigateToViewRecordings}
        onMeetingSessionDetails={handleNavigateToMeetingSessionDetails}
        onMarkNoShow={handleNavigateToMarkNoShow}
        onReportBooking={() => {
          showInfoAlert("Report Booking", "Report booking functionality is not yet available");
        }}
        onCancelBooking={handleCancelBooking}
      />
    );
  };

  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === "monthHeader") {
      return (
        <View className="border-b border-[#E5E5EA] bg-[#f1f1f1] px-2 py-3 dark:border-[#4D4D4D] dark:bg-[#171717] md:px-4">
          <Text className="text-base font-bold text-[#333] dark:text-white">{item.monthYear}</Text>
        </View>
      );
    }
    if (item.type === "recurringGroup") {
      return (
        <RecurringBookingListItem
          group={item.group}
          userEmail={userInfo?.email}
          isConfirmingAll={isConfirmingAll}
          isDecliningAll={isDecliningAll}
          isCancellingAll={isCancellingAll}
          onPress={handleRecurringGroupPress}
          onConfirmAll={handleConfirmAll}
          onRejectAll={handleRejectAll}
          onCancelAllRemaining={handleCancelAllRemaining}
          onReschedule={handleNavigateToReschedule}
          onEditLocation={handleNavigateToEditLocation}
          onAddGuests={handleNavigateToAddGuests}
          onViewRecordings={handleNavigateToViewRecordings}
          onMeetingSessionDetails={handleNavigateToMeetingSessionDetails}
          onMarkNoShow={handleNavigateToMarkNoShow}
          onReportBooking={() => {
            showInfoAlert("Report Booking", "Report booking functionality is not yet available");
          }}
          onCancelBooking={handleCancelBooking}
        />
      );
    }
    return renderBookingItem({ item: item.booking });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-black">
        {renderHeader?.()}
        {renderFilterControls?.()}
        <BookingListSkeleton count={4} iosStyle={iosStyle} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-black">
        {renderHeader?.()}
        {renderFilterControls?.()}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5 dark:bg-black">
          <Ionicons name="alert-circle" size={64} color={theme.destructive} />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800 dark:text-white">
            Unable to load bookings
          </Text>
          <Text className="mb-6 text-center text-base text-gray-500 dark:text-[#A3A3A3]">
            {error}
          </Text>
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
        <View className="flex-1 bg-gray-50 dark:bg-black">
          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
            refreshControl={
              <RefreshControl refreshing={isManualRefreshing} onRefresh={manualRefresh} />
            }
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: isDark ? "#000000" : "white" }}
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
        <View className="flex-1 bg-gray-50 dark:bg-black">
          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
            refreshControl={
              <RefreshControl refreshing={isManualRefreshing} onRefresh={manualRefresh} />
            }
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: isDark ? "#000000" : "white" }}
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
        {isManualRefreshing ? (
          <BookingListSkeleton count={4} iosStyle={iosStyle} />
        ) : (
          <>
            <Activity mode={iosStyle ? "visible" : "hidden"}>
              <FlatList
                data={listItems}
                keyExtractor={(item) => item.key}
                renderItem={renderListItem}
                contentContainerStyle={{ paddingBottom: 90 }}
                refreshControl={<RefreshControl refreshing={false} onRefresh={manualRefresh} />}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
                style={{ backgroundColor: isDark ? "#000000" : "white" }}
              />
            </Activity>

            <Activity mode={!iosStyle ? "visible" : "hidden"}>
              <View className="flex-1 px-2 pt-4 md:px-4">
                <View className="flex-1 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white dark:border-[#4D4D4D] dark:bg-black">
                  <FlatList
                    data={listItems}
                    keyExtractor={(item) => item.key}
                    renderItem={renderListItem}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    refreshControl={<RefreshControl refreshing={false} onRefresh={manualRefresh} />}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </View>
            </Activity>
          </>
        )}
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
        showBookingActionsModal={false}
        selectedBooking={selectedBooking}
        onActionsClose={() => {}}
        onReschedule={() => {}}
        onCancel={() => {}}
        onEditLocation={() => {}}
        onAddGuests={() => {}}
        onViewRecordings={() => {}}
        onMeetingSessionDetails={() => {}}
        onMarkNoShow={() => {}}
      />

      {/* Web/Extension: Cancel Event Modal */}
      {Platform.OS === "web" && (
        <FullScreenModal
          visible={showCancelModal}
          animationType="fade"
          onRequestClose={handleCloseCancelModal}
        >
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#171717]">
              <View className="p-6">
                <View className="flex-row">
                  {/* Danger icon */}
                  <View className="mr-3 self-start rounded-full bg-red-50 p-2 dark:bg-red-900/30">
                    <Ionicons name="alert-circle" size={20} color={theme.destructive} />
                  </View>

                  {/* Title and description */}
                  <View className="flex-1">
                    <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                      Cancel Event
                    </Text>
                    <Text className="text-sm leading-5 text-gray-600 dark:text-[#A3A3A3]">
                      Are you sure you want to cancel "{cancelBooking?.title}"? Cancellation reason
                      will be shared with guests.
                    </Text>

                    {/* Reason Input */}
                    <View className="mt-4">
                      <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Reason for cancellation
                      </Text>
                      <TextInput
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 dark:border-[#4D4D4D] dark:bg-[#2C2C2E] dark:text-white"
                        placeholder="Why are you cancelling?"
                        placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        style={{ minHeight: 80 }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Buttons */}
              <View className="flex-row-reverse gap-2 px-6 pb-6 pt-2">
                <TouchableOpacity
                  className="rounded-lg px-4 py-2.5"
                  style={{ backgroundColor: isDark ? "#FFFFFF" : "#111827" }}
                  onPress={handleSubmitCancel}
                >
                  <Text className="text-center text-base font-medium text-white dark:text-black">
                    Cancel Event
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 dark:border-[#4D4D4D] dark:bg-[#2C2C2E]"
                  onPress={handleCloseCancelModal}
                >
                  <Text className="text-center text-base font-medium text-gray-700 dark:text-white">
                    Nevermind
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </FullScreenModal>
      )}

      {/* Cancel Event AlertDialog for Android */}
      {Platform.OS === "android" && (
        <AlertDialog open={showCancelModal} onOpenChange={handleCloseCancelModal}>
          <AlertDialogContent>
            <AlertDialogHeader className="items-start">
              <AlertDialogTitle>
                <UIText className="text-left text-lg font-semibold dark:text-white">
                  Cancel event
                </UIText>
              </AlertDialogTitle>
              <AlertDialogDescription>
                <UIText className="text-left text-sm text-muted-foreground">
                  Cancellation reason will be shared with guests
                </UIText>
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Reason Input */}
            <View>
              <UIText className="mb-2 text-sm font-medium dark:text-white">
                Reason for cancellation
              </UIText>
              <TextInput
                className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 dark:border-[#4D4D4D] dark:bg-[#2C2C2E] dark:text-white"
                placeholder="Why are you cancelling?"
                placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
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

      {/* Android: Cancel All Remaining Dialog */}
      {Platform.OS === "android" && showCancelAllDialog && cancelAllGroup && (
        <AlertDialog open={showCancelAllDialog} onOpenChange={setShowCancelAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel All Remaining</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel all {cancelAllGroup.remainingCount} remaining
                bookings in this series?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <View className="py-4">
              <Text className="mb-2 text-sm font-medium text-cal-text dark:text-white">
                Cancellation Reason (required)
              </Text>
              <TextInput
                className="rounded-lg border border-cal-border bg-cal-bg px-3 py-2 text-base text-cal-text dark:border-[#4D4D4D] dark:bg-[#2C2C2E] dark:text-white"
                placeholder="Please provide a reason for cancelling"
                placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
                value={cancelAllReason}
                onChangeText={setCancelAllReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </View>

            <AlertDialogFooter>
              <AlertDialogCancel
                onPress={() => {
                  setShowCancelAllDialog(false);
                  setCancelAllGroup(null);
                  setCancelAllReason("");
                }}
              >
                <UIText>Nevermind</UIText>
              </AlertDialogCancel>
              <AlertDialogAction
                onPress={() => {
                  const reason = cancelAllReason.trim() || "Cancelled all remaining";
                  setShowCancelAllDialog(false);
                  setIsCancellingAll(true);

                  cancelBookingMutation(
                    { uid: cancelAllGroup.recurringBookingUid, reason },
                    {
                      onSuccess: () => {
                        showSuccessAlert("Success", "All remaining bookings have been cancelled.");
                        setIsCancellingAll(false);
                        setCancelAllGroup(null);
                        setCancelAllReason("");
                      },
                      onError: () => {
                        showErrorAlert("Error", "Failed to cancel bookings. Please try again.");
                        setIsCancellingAll(false);
                      },
                    }
                  );
                }}
              >
                <UIText className="text-white">Cancel All</UIText>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Android: Reject All Dialog */}
      {Platform.OS === "android" && showRejectAllDialog && rejectAllGroup && (
        <AlertDialog open={showRejectAllDialog} onOpenChange={setShowRejectAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject All</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject all unconfirmed bookings in this series?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <View className="py-4">
              <Text className="mb-2 text-sm font-medium text-cal-text dark:text-white">
                Rejection Reason (optional)
              </Text>
              <TextInput
                className="rounded-lg border border-cal-border bg-cal-bg px-3 py-2 text-base text-cal-text dark:border-[#4D4D4D] dark:bg-[#2C2C2E] dark:text-white"
                placeholder="Optionally provide a reason for rejecting"
                placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
                value={rejectAllReason}
                onChangeText={setRejectAllReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </View>

            <AlertDialogFooter>
              <AlertDialogCancel
                onPress={() => {
                  setShowRejectAllDialog(false);
                  setRejectAllGroup(null);
                  setRejectAllReason("");
                }}
              >
                <UIText>Nevermind</UIText>
              </AlertDialogCancel>
              <AlertDialogAction
                onPress={async () => {
                  const reason = rejectAllReason.trim() || undefined;
                  setShowRejectAllDialog(false);
                  setIsDecliningAll(true);

                  const unconfirmedBookings = rejectAllGroup.bookings.filter(
                    (b) =>
                      b.status?.toLowerCase() === "pending" ||
                      b.status?.toLowerCase() === "requires_confirmation" ||
                      b.requiresConfirmation
                  );

                  let successCount = 0;
                  let errorCount = 0;

                  for (const booking of unconfirmedBookings) {
                    try {
                      const success = await new Promise<boolean>((resolve, _reject) => {
                        declineBookingMutation(
                          { uid: booking.uid, reason },
                          {
                            onSuccess: () => {
                              resolve(true);
                            },
                            onError: () => {
                              resolve(false);
                            },
                          }
                        );
                      });

                      if (success) {
                        successCount++;
                      } else {
                        errorCount++;
                      }
                    } catch {
                      errorCount++;
                    }
                  }

                  setIsDecliningAll(false);
                  setRejectAllGroup(null);
                  setRejectAllReason("");

                  if (errorCount > 0) {
                    showInfoAlert(
                      "Partial Success",
                      `Rejected ${successCount} bookings. Failed to reject ${errorCount}.`
                    );
                  } else {
                    showSuccessAlert("Success", `All ${successCount} bookings have been rejected.`);
                  }
                }}
              >
                <UIText className="text-white">Reject All</UIText>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
