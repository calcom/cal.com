import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { BookingDetailScreen } from "@/components/screens/BookingDetailScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useBookingByUid } from "@/hooks/useBookings";
import { showErrorAlert, showInfoAlert } from "@/utils/alerts";
import { type BookingActionsResult, getBookingActions } from "@/utils/booking-actions";

// Empty actions result for when no booking is loaded
const EMPTY_ACTIONS: BookingActionsResult = {
  reschedule: { visible: false, enabled: false },
  rescheduleRequest: { visible: false, enabled: false },
  cancel: { visible: false, enabled: false },
  changeLocation: { visible: false, enabled: false },
  addGuests: { visible: false, enabled: false },
  viewRecordings: { visible: false, enabled: false },
  meetingSessionDetails: { visible: false, enabled: false },
  markNoShow: { visible: false, enabled: false },
};

// Type for action handlers exposed by BookingDetailScreen
type ActionHandlers = {
  openRescheduleModal: () => void;
  openEditLocationModal: () => void;
  openAddGuestsModal: () => void;
  openViewRecordingsModal: () => void;
  openMeetingSessionDetailsModal: () => void;
  openMarkNoShowModal: () => void;
  handleCancelBooking: () => void;
};

export default function BookingDetail() {
  "use no memo";
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { userInfo } = useAuth();

  // Use React Query hook for booking data - single source of truth
  const { data: booking, isLoading, error, refetch, isRefetching } = useBookingByUid(uid);

  // Ref to store action handlers from BookingDetailScreen
  const actionHandlersRef = useRef<ActionHandlers | null>(null);

  // Callback to receive action handlers from BookingDetailScreen
  const handleActionsReady = useCallback((handlers: ActionHandlers) => {
    actionHandlersRef.current = handlers;
  }, []);

  // Compute actions using centralized gating (same as BookingDetailScreen)
  const actions = useMemo(() => {
    if (!booking) return EMPTY_ACTIONS;
    return getBookingActions({
      booking,
      eventType: undefined, // EventType not available in this context
      currentUserId: userInfo?.id,
      currentUserEmail: userInfo?.email,
      isOnline: true, // Assume online for now
    });
  }, [booking, userInfo?.id, userInfo?.email]);

  // Action handlers that use the booking data
  // Note: These are stable functions that don't change, so we don't memoize them
  // They access refs which is safe in event handlers
  const handleReschedule = useCallback(() => {
    if (actionHandlersRef.current?.openRescheduleModal) {
      actionHandlersRef.current.openRescheduleModal();
    } else {
      showErrorAlert("Error", "Unable to reschedule. Please try again.");
    }
  }, []);

  const handleEditLocation = useCallback(() => {
    if (actionHandlersRef.current?.openEditLocationModal) {
      actionHandlersRef.current.openEditLocationModal();
    } else {
      showErrorAlert("Error", "Unable to edit location. Please try again.");
    }
  }, []);

  const handleAddGuests = useCallback(() => {
    if (actionHandlersRef.current?.openAddGuestsModal) {
      actionHandlersRef.current.openAddGuestsModal();
    } else {
      showErrorAlert("Error", "Unable to add guests. Please try again.");
    }
  }, []);

  const handleViewRecordings = useCallback(() => {
    if (actionHandlersRef.current?.openViewRecordingsModal) {
      actionHandlersRef.current.openViewRecordingsModal();
    } else {
      showErrorAlert("Error", "Unable to view recordings. Please try again.");
    }
  }, []);

  const handleSessionDetails = useCallback(() => {
    if (actionHandlersRef.current?.openMeetingSessionDetailsModal) {
      actionHandlersRef.current.openMeetingSessionDetailsModal();
    } else {
      showErrorAlert("Error", "Unable to view session details. Please try again.");
    }
  }, []);

  const handleMarkNoShow = useCallback(() => {
    if (actionHandlersRef.current?.openMarkNoShowModal) {
      actionHandlersRef.current.openMarkNoShowModal();
    } else {
      showErrorAlert("Error", "Unable to mark no-show. Please try again.");
    }
  }, []);

  const handleReport = useCallback(() => {
    showInfoAlert("Report Booking", "Report booking functionality is not yet available");
  }, []);

  const handleCancel = useCallback(() => {
    if (actionHandlersRef.current?.handleCancelBooking) {
      actionHandlersRef.current.handleCancelBooking();
    } else {
      showErrorAlert("Error", "Unable to cancel. Please try again.");
    }
  }, []);

  // Define booking actions organized by sections
  // For iOS glass UI (header menu), we filter out actions where !visible || !enabled
  // This matches the behavior in BookingListItem.ios.tsx context menu
  const bookingActionsSections = useMemo(() => {
    // All possible actions with their gating keys
    const allEditEventActions = [
      {
        id: "reschedule",
        label: "Reschedule Booking",
        icon: "calendar" as const,
        onPress: handleReschedule,
        gatingKey: "reschedule" as const,
      },
      {
        id: "edit-location",
        label: "Edit Location",
        icon: "location" as const,
        onPress: handleEditLocation,
        gatingKey: "changeLocation" as const,
      },
      {
        id: "add-guests",
        label: "Add Guests",
        icon: "person.badge.plus" as const,
        onPress: handleAddGuests,
        gatingKey: "addGuests" as const,
      },
    ];

    const allAfterEventActions = [
      {
        id: "view-recordings",
        label: "View Recordings",
        icon: "video" as const,
        onPress: handleViewRecordings,
        gatingKey: "viewRecordings" as const,
      },
      {
        id: "session-details",
        label: "Meeting Session Details",
        icon: "info.circle" as const,
        onPress: handleSessionDetails,
        gatingKey: "meetingSessionDetails" as const,
      },
      {
        id: "mark-no-show",
        label: "Mark as No-Show",
        icon: "eye.slash" as const,
        onPress: handleMarkNoShow,
        gatingKey: "markNoShow" as const,
      },
    ];

    const allStandaloneActions = [
      {
        id: "report",
        label: "Report Booking",
        icon: "flag" as const,
        onPress: handleReport,
        destructive: true,
        // Report is always visible (no gating)
        gatingKey: null,
      },
      {
        id: "cancel",
        label: "Cancel Event",
        icon: "xmark.circle" as const,
        onPress: handleCancel,
        destructive: true,
        gatingKey: "cancel" as const,
      },
    ];

    // Filter actions based on gating (for glass UI, only show visible && enabled)
    const filterAction = (action: { gatingKey: keyof typeof actions | null }) => {
      if (action.gatingKey === null) return true; // No gating, always show
      const gating = actions[action.gatingKey];
      return gating.visible && gating.enabled;
    };

    return {
      editEvent: allEditEventActions.filter(filterAction),
      afterEvent: allAfterEventActions.filter(filterAction),
      standalone: allStandaloneActions.filter(filterAction),
    };
  }, [
    actions,
    handleReschedule,
    handleEditLocation,
    handleAddGuests,
    handleViewRecordings,
    handleSessionDetails,
    handleMarkNoShow,
    handleReport,
    handleCancel,
  ]);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Booking Details</Stack.Header.Title>

          {/* Header right and left API only works on iOS ATM see: https://docs.expo.dev/versions/unversioned/sdk/router/#stackheaderright */}
          <Stack.Header.Right>
            <Stack.Header.Menu>
              <Stack.Header.Label>Actions</Stack.Header.Label>
              <Stack.Header.Icon sf="ellipsis" />

              {/* Edit Event Section */}
              <Stack.Header.Menu inline title="Edit Event">
                {bookingActionsSections.editEvent.map((action) => (
                  <Stack.Header.MenuAction
                    key={action.id}
                    icon={action.icon}
                    onPress={action.onPress}
                  >
                    {action.label}
                  </Stack.Header.MenuAction>
                ))}
              </Stack.Header.Menu>

              {/* After Event Section */}
              <Stack.Header.Menu inline title="After Event">
                {bookingActionsSections.afterEvent.map((action) => (
                  <Stack.Header.MenuAction
                    key={action.id}
                    icon={action.icon}
                    onPress={action.onPress}
                  >
                    {action.label}
                  </Stack.Header.MenuAction>
                ))}
              </Stack.Header.Menu>

              {/* Danger Zone Submenu */}
              <Stack.Header.Menu inline title="Danger Zone">
                {bookingActionsSections.standalone.map((action) => (
                  <Stack.Header.MenuAction
                    key={action.id}
                    icon={action.icon}
                    onPress={action.onPress}
                    destructive
                  >
                    {action.label}
                  </Stack.Header.MenuAction>
                ))}
              </Stack.Header.Menu>
            </Stack.Header.Menu>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <BookingDetailScreen
        booking={booking}
        isLoading={isLoading}
        error={error ?? null}
        refetch={refetch}
        isRefetching={isRefetching}
        onActionsReady={handleActionsReady}
      />

      {/* Action Modals for iOS header menu */}
    </>
  );
}
