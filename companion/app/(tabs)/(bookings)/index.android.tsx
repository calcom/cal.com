import { Ionicons } from "@expo/vector-icons";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BookingListItem } from "@/components/booking-list-item/BookingListItem";
import { BookingModals } from "@/components/booking-modals/BookingModals";
import { EmptyScreen } from "@/components/EmptyScreen";
import { Header } from "@/components/Header";
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
  useCancelBooking,
  useConfirmBooking,
  useDeclineBooking,
} from "@/hooks";
import { useActiveBookingFilter } from "@/hooks/useActiveBookingFilter";
import { useBookings } from "@/hooks/useBookings";
import type { Booking, EventType } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import type { ListItem } from "@/utils/bookings-utils";
import {
  filterByEventType,
  getEmptyStateContent,
  groupBookingsByMonth,
  searchBookings,
} from "@/utils/bookings-utils";
import { offlineAwareRefresh } from "@/utils/network";
import { safeLogError } from "@/utils/safeLogger";

// Toast state type
type ToastState = {
  visible: boolean;
  message: string;
  type: "success" | "error";
};

export default function BookingsAndroid() {
  const router = useRouter();
  const { userInfo } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const [selectedEventTypeLabel, setSelectedEventTypeLabel] = useState<string | null>(null);
  const [eventTypesLoading, setEventTypesLoading] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Toast state (fixed position snackbar at bottom)
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  // AlertDialog state for cancel confirmation
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Selected booking for actions modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingActionsModal, setShowBookingActionsModal] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Use the active booking filter hook
  const { activeFilter, filterLabels, activeIndex, filterParams, handleSegmentChange } =
    useActiveBookingFilter("upcoming", () => {
      // Clear dependent filters when status filter changes
      setSearchQuery("");
      setSelectedEventTypeId(null);
      setSelectedEventTypeLabel(null);
    });

  // Use React Query hook for fetching bookings
  const {
    data: rawBookings = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useBookings(filterParams);

  // Cancel booking mutation
  const { mutate: cancelBookingMutation, isPending: isCancelling } = useCancelBooking();

  // Confirm booking mutation
  const { mutate: confirmBookingMutation, isPending: isConfirming } = useConfirmBooking();

  // Decline booking mutation
  const { mutate: declineBookingMutation, isPending: isDeclining } = useDeclineBooking();

  // Convert query error to string
  const isAuthError =
    queryError?.message?.includes("Authentication") ||
    queryError?.message?.includes("sign in") ||
    queryError?.message?.includes("401");
  const error = queryError && !isAuthError && __DEV__ ? "Failed to load bookings." : null;

  // Function to show toast (snackbar at bottom)
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, message, type });
  }, []);

  // Auto-dismiss toast after 2.5 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ visible: false, message: "", type: "success" });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

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

  // Apply local filters (search and event type)
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    filtered = filterByEventType(filtered, selectedEventTypeId);
    filtered = searchBookings(filtered, searchQuery);
    return filtered;
  }, [bookings, searchQuery, selectedEventTypeId]);

  // Prevents showing loading indicator when refreshing or changing filters
  function manualRefresh() {
    setIsManualRefreshing(true);
    offlineAwareRefresh(refetch).finally(() => {
      setIsManualRefreshing(false);
    });
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const fetchEventTypes = async () => {
    setEventTypesLoading(true);
    try {
      const types = await CalComAPIService.getEventTypes();
      setEventTypes(types);
      setEventTypesLoading(false);
    } catch (err) {
      safeLogError("Error fetching event types:", err);
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

  // Navigation handlers
  const handleBookingPress = (booking: Booking) => {
    router.push({
      pathname: "/booking-detail",
      params: { uid: booking.uid },
    });
  };

  const handleNavigateToReschedule = useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/reschedule",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  const handleNavigateToEditLocation = useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/edit-location",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  const handleNavigateToAddGuests = useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/add-guests",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  const handleNavigateToMarkNoShow = useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/mark-no-show",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  const handleNavigateToViewRecordings = useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/view-recordings",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  const handleNavigateToMeetingSessionDetails = useCallback(
    (booking: Booking) => {
      router.push({
        pathname: "/meeting-session-details",
        params: { uid: booking.uid },
      });
    },
    [router]
  );

  // Cancel booking handler - opens AlertDialog
  const handleCancelBooking = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelReason("");
    setShowCancelDialog(true);
  };

  // Confirm cancel with reason
  const confirmCancel = () => {
    if (!bookingToCancel) return;

    const reason = cancelReason.trim() || "Event cancelled by host";

    cancelBookingMutation(
      { uid: bookingToCancel.uid, reason },
      {
        onSuccess: () => {
          setShowCancelDialog(false);
          setBookingToCancel(null);
          setCancelReason("");
          showToast("Event cancelled successfully");
        },
        onError: () => {
          showToast("Failed to cancel event", "error");
        },
      }
    );
  };

  // Inline confirm handler
  const handleInlineConfirm = (booking: Booking) => {
    confirmBookingMutation(
      { uid: booking.uid },
      {
        onSuccess: () => {
          showToast("Booking confirmed successfully");
        },
        onError: () => {
          showToast("Failed to confirm booking", "error");
        },
      }
    );
  };

  // Open reject modal
  const handleOpenRejectModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setRejectReason("");
    setShowRejectModal(true);
  };

  // Submit reject
  const handleSubmitReject = (reasonOverride?: string) => {
    if (!selectedBooking) return;

    const reason = reasonOverride !== undefined ? reasonOverride : rejectReason;

    declineBookingMutation(
      { uid: selectedBooking.uid, reason: reason || undefined },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setSelectedBooking(null);
          setRejectReason("");
          showToast("Booking rejected successfully");
        },
        onError: () => {
          showToast("Failed to reject booking", "error");
        },
      }
    );
  };

  // Close reject modal
  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setSelectedBooking(null);
    setRejectReason("");
  };

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
        <View className="border-b border-gray-200 bg-white px-2 py-3 md:px-4">
          {segmentedControlContent}
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

  // Determine what content to show
  const showEmptyState = bookings.length === 0 && !loading;
  const showSearchEmptyState =
    filteredBookings.length === 0 && searchQuery.trim() !== "" && !loading && !showEmptyState;
  const showList = !showEmptyState && !showSearchEmptyState && !loading;
  const emptyState = getEmptyStateContent(activeFilter);

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
          <Ionicons name="alert-circle" size={64} color="#800020" />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
            Unable to load bookings
          </Text>
          <Text className="mb-6 text-center text-base text-gray-500">{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Header />
      {renderSegmentedControl()}

      {/* Empty state - no bookings */}
      {showEmptyState && (
        <View className="flex-1 bg-gray-50">
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
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
      )}

      {/* Search empty state */}
      {showSearchEmptyState && (
        <View className="flex-1 bg-gray-50">
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
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
      )}

      {/* Bookings list */}
      {showList && (
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
      )}

      {/* Modals */}
      <BookingModals
        showRescheduleModal={false}
        rescheduleBooking={null}
        isRescheduling={false}
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
        onFilterClose={() => setShowFilterModal(false)}
        onEventTypeSelect={handleEventTypeSelect}
        showBookingActionsModal={showBookingActionsModal}
        selectedBooking={selectedBooking}
        onActionsClose={() => setShowBookingActionsModal(false)}
        onReschedule={() => {
          if (selectedBooking) {
            setShowBookingActionsModal(false);
            handleNavigateToReschedule(selectedBooking);
          }
        }}
        onCancel={() => {
          if (selectedBooking) {
            setShowBookingActionsModal(false);
            handleCancelBooking(selectedBooking);
          }
        }}
        onEditLocation={(booking) => {
          setShowBookingActionsModal(false);
          handleNavigateToEditLocation(booking);
        }}
        onAddGuests={(booking) => {
          setShowBookingActionsModal(false);
          handleNavigateToAddGuests(booking);
        }}
        onViewRecordings={(booking) => {
          setShowBookingActionsModal(false);
          handleNavigateToViewRecordings(booking);
        }}
        onMeetingSessionDetails={(booking) => {
          setShowBookingActionsModal(false);
          handleNavigateToMeetingSessionDetails(booking);
        }}
        onMarkNoShow={(booking) => {
          setShowBookingActionsModal(false);
          handleNavigateToMarkNoShow(booking);
        }}
      />

      {/* Cancel Booking AlertDialog with Reason Input */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event</AlertDialogTitle>
            <AlertDialogDescription>
              {bookingToCancel
                ? `Are you sure you want to cancel "${bookingToCancel.title}"?`
                : "Are you sure you want to cancel this event?"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Cancellation Reason Input */}
          <View className="px-1">
            <Text className="mb-2 text-sm font-medium text-gray-700">
              Cancellation Reason (optional)
            </Text>
            <TextInput
              className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900"
              placeholder="Enter reason for cancellation..."
              placeholderTextColor="#9CA3AF"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </View>

          <AlertDialogFooter>
            <AlertDialogCancel
              onPress={() => {
                setShowCancelDialog(false);
                setBookingToCancel(null);
                setCancelReason("");
              }}
              disabled={isCancelling}
            >
              <UIText>Keep Event</UIText>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmCancel} disabled={isCancelling}>
              <UIText>Cancel Event</UIText>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast Snackbar */}
      {toast.visible && (
        <View
          style={{
            position: "absolute",
            bottom: 100,
            left: 16,
            right: 16,
          }}
          pointerEvents="none"
        >
          <View
            className={`flex-row items-center rounded-lg px-4 py-3 shadow-lg ${
              toast.type === "error" ? "bg-red-600" : "bg-gray-800"
            }`}
          >
            <Ionicons
              name={toast.type === "error" ? "close-circle" : "checkmark-circle"}
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="flex-1 text-sm font-medium text-white">{toast.message}</Text>
          </View>
        </View>
      )}
    </>
  );
}
