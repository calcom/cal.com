import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { useColorScheme } from "react-native";
import { BookingDetailScreen } from "@/components/screens/BookingDetailScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useBookingByUid } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showInfoAlert, showSuccessAlert } from "@/utils/alerts";
import { type BookingActionsResult, getBookingActions } from "@/utils/booking-actions";
import { openInAppBrowser } from "@/utils/browser";
import { isLiquidGlassAvailable } from "expo-glass-effect";

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

// Get month name from date string
const getMonthName = (dateString: string | undefined): string => {
  if (!dateString) return "Back";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Back";
  return date.toLocaleDateString("en-US", { month: "long" });
};

// Get meeting URL from booking
const getMeetingUrl = (booking: Booking | null): string | null => {
  if (!booking) return null;

  // Check metadata for videoCallUrl first
  const videoCallUrl = booking.responses?.videoCallUrl;
  if (typeof videoCallUrl === "string" && videoCallUrl.startsWith("http")) {
    return videoCallUrl;
  }

  // Check location
  const location = booking.location;
  if (typeof location === "string" && location.startsWith("http")) {
    return location;
  }

  return null;
};

export default function BookingDetailIOS() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { userInfo } = useAuth();
  const colorScheme = useColorScheme();

  // Use React Query hook for booking data - single source of truth
  const { data: booking, isLoading, error, refetch, isRefetching } = useBookingByUid(uid);

  // Ref to store action handlers from BookingDetailScreen
  const actionHandlersRef = useRef<ActionHandlers | null>(null);

  // Callback to receive action handlers from BookingDetailScreen
  const handleActionsReady = useCallback((handlers: ActionHandlers) => {
    actionHandlersRef.current = handlers;
  }, []);

  // Get the month name from booking start date for back button
  const monthName = useMemo(() => {
    const startTime = booking?.start || booking?.startTime;
    return getMonthName(startTime);
  }, [booking?.start, booking?.startTime]);

  // Get meeting URL for Join button
  const meetingUrl = useMemo(() => getMeetingUrl(booking ?? null), [booking]);

  // Handle join meeting
  const handleJoinMeeting = useCallback(() => {
    if (meetingUrl) {
      openInAppBrowser(meetingUrl, "meeting link");
    }
  }, [meetingUrl]);

  // Handle copy meeting link
  const handleCopyMeetingLink = useCallback(async () => {
    if (meetingUrl) {
      await Clipboard.setStringAsync(meetingUrl);
      showSuccessAlert("Copied", "Meeting link copied to clipboard");
    }
  }, [meetingUrl]);

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

  // Invoke a handler by name - only accesses ref at invocation time (event handler)
  // This avoids creating closures that capture the ref during render
  const invokeHandler = useCallback((handlerName: keyof ActionHandlers, errorMessage: string) => {
    const handlers = actionHandlersRef.current;
    if (handlers?.[handlerName]) {
      (handlers[handlerName] as () => void)();
    } else {
      showErrorAlert("Error", errorMessage);
    }
  }, []);

  // Define and filter booking actions
  // Actions store handler metadata instead of closures to avoid capturing ref during render
  const bookingActionsSections = useMemo(() => {
    // Define all actions with handler metadata (not closures)
    const allEditEventActions = [
      {
        id: "reschedule",
        label: "Reschedule Booking",
        icon: "calendar" as const,
        handlerName: "openRescheduleModal" as const,
        errorMessage: "Unable to reschedule. Please try again.",
        gatingKey: "reschedule" as const,
      },
      {
        id: "edit-location",
        label: "Edit Location",
        icon: "location" as const,
        handlerName: "openEditLocationModal" as const,
        errorMessage: "Unable to edit location. Please try again.",
        gatingKey: "changeLocation" as const,
      },
      {
        id: "add-guests",
        label: "Add Guests",
        icon: "person.badge.plus" as const,
        handlerName: "openAddGuestsModal" as const,
        errorMessage: "Unable to add guests. Please try again.",
        gatingKey: "addGuests" as const,
      },
    ];

    const allAfterEventActions = [
      {
        id: "view-recordings",
        label: "View Recordings",
        icon: "video" as const,
        handlerName: "openViewRecordingsModal" as const,
        errorMessage: "Unable to view recordings. Please try again.",
        gatingKey: "viewRecordings" as const,
      },
      {
        id: "session-details",
        label: "Meeting Session Details",
        icon: "info.circle" as const,
        handlerName: "openMeetingSessionDetailsModal" as const,
        errorMessage: "Unable to view session details. Please try again.",
        gatingKey: "meetingSessionDetails" as const,
      },
      {
        id: "mark-no-show",
        label: "Mark as No-Show",
        icon: "eye.slash" as const,
        handlerName: "openMarkNoShowModal" as const,
        errorMessage: "Unable to mark no-show. Please try again.",
        gatingKey: "markNoShow" as const,
      },
    ];

    const allStandaloneActions = [
      {
        id: "report",
        label: "Report Booking",
        icon: "flag" as const,
        handlerName: null,
        errorMessage: null,
        customHandler: () => {
          showInfoAlert("Report Booking", "Report booking functionality is not yet available");
        },
        destructive: true,
        gatingKey: null,
      },
      {
        id: "cancel",
        label: "Cancel Event",
        icon: "xmark.circle" as const,
        handlerName: "handleCancelBooking" as const,
        errorMessage: "Unable to cancel. Please try again.",
        destructive: true,
        gatingKey: "cancel" as const,
      },
    ];

    // Filter actions based on gating logic
    const filterAction = (action: { gatingKey: keyof typeof actions | null }) => {
      if (action.gatingKey === null) return true;
      const gating = actions[action.gatingKey];
      return gating.visible && gating.enabled;
    };

    return {
      editEvent: allEditEventActions.filter(filterAction),
      afterEvent: allAfterEventActions.filter(filterAction),
      standalone: allStandaloneActions.filter(filterAction),
    };
  }, [actions]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Booking", // This appears in long-press navigation history
          headerBackTitle: monthName, // This shows on the back button
          headerBackButtonDisplayMode: "default",
          headerTitle: "", // Hide the title in the header bar itself
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      />

      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : "light"}
      >
        <Stack.Header.Right>
          {/* Actions Menu */}
          <Stack.Header.Menu>
            <Stack.Header.Icon sf="ellipsis" />

            {/* Copy Meeting Link - only show if there's a meeting URL */}
            {meetingUrl && (
              <Stack.Header.MenuAction icon="doc.on.doc" onPress={handleCopyMeetingLink}>
                Copy Meeting Link
              </Stack.Header.MenuAction>
            )}

            {/* Edit Event Section */}
            <Stack.Header.Menu inline title="Edit Event">
              {bookingActionsSections.editEvent.map((action) => (
                <Stack.Header.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={() => invokeHandler(action.handlerName, action.errorMessage)}
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
                  onPress={() => invokeHandler(action.handlerName, action.errorMessage)}
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
                  onPress={() => {
                    if (action.customHandler) {
                      action.customHandler();
                    } else if (action.handlerName && action.errorMessage) {
                      invokeHandler(action.handlerName, action.errorMessage);
                    }
                  }}
                  destructive
                >
                  {action.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>
          </Stack.Header.Menu>

          {meetingUrl && (
            <Stack.Header.Button
              onPress={handleJoinMeeting}
              variant="prominent"
              tintColor={colorScheme === "dark" ? "#FFF" : "#000"}
            >
              Join
            </Stack.Header.Button>
          )}
        </Stack.Header.Right>
      </Stack.Header>

      <BookingDetailScreen
        booking={booking}
        isLoading={isLoading}
        error={error ?? null}
        refetch={refetch}
        isRefetching={isRefetching}
        onActionsReady={handleActionsReady}
      />
    </>
  );
}
