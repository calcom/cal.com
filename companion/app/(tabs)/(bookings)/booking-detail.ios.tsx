import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { BookingDetailScreen } from "@/components/screens/BookingDetailScreen";
import { useAuth } from "@/contexts/AuthContext";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { type BookingActionsResult, getBookingActions } from "@/utils/booking-actions";
import { openInAppBrowser } from "@/utils/browser";

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
  "use no memo";
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { userInfo } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);

  // Ref to store action handlers from BookingDetailScreen
  const actionHandlersRef = useRef<ActionHandlers | null>(null);

  // Callback to receive action handlers from BookingDetailScreen
  const handleActionsReady = useCallback((handlers: ActionHandlers) => {
    actionHandlersRef.current = handlers;
  }, []);

  // Fetch booking data for the iOS header menu actions
  useEffect(() => {
    if (uid) {
      CalComAPIService.getBookingByUid(uid)
        .then(setBooking)
        .catch(() => {
          // Error handling is done in BookingDetailScreen
        });
    }
  }, [uid]);

  // Get the month name from booking start date for back button
  const monthName = useMemo(() => {
    const startTime = booking?.start || booking?.startTime;
    return getMonthName(startTime);
  }, [booking?.start, booking?.startTime]);

  // Get meeting URL for Join button
  const meetingUrl = useMemo(() => getMeetingUrl(booking), [booking]);

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
      Alert.alert("Copied", "Meeting link copied to clipboard");
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

  // Action handlers that use the booking data
  const handleReschedule = useCallback(() => {
    if (actionHandlersRef.current?.openRescheduleModal) {
      actionHandlersRef.current.openRescheduleModal();
    } else {
      Alert.alert("Error", "Unable to reschedule. Please try again.");
    }
  }, []);

  const handleEditLocation = useCallback(() => {
    if (actionHandlersRef.current?.openEditLocationModal) {
      actionHandlersRef.current.openEditLocationModal();
    } else {
      Alert.alert("Error", "Unable to edit location. Please try again.");
    }
  }, []);

  const handleAddGuests = useCallback(() => {
    if (actionHandlersRef.current?.openAddGuestsModal) {
      actionHandlersRef.current.openAddGuestsModal();
    } else {
      Alert.alert("Error", "Unable to add guests. Please try again.");
    }
  }, []);

  const handleViewRecordings = useCallback(() => {
    if (actionHandlersRef.current?.openViewRecordingsModal) {
      actionHandlersRef.current.openViewRecordingsModal();
    } else {
      Alert.alert("Error", "Unable to view recordings. Please try again.");
    }
  }, []);

  const handleSessionDetails = useCallback(() => {
    if (actionHandlersRef.current?.openMeetingSessionDetailsModal) {
      actionHandlersRef.current.openMeetingSessionDetailsModal();
    } else {
      Alert.alert("Error", "Unable to view session details. Please try again.");
    }
  }, []);

  const handleMarkNoShow = useCallback(() => {
    if (actionHandlersRef.current?.openMarkNoShowModal) {
      actionHandlersRef.current.openMarkNoShowModal();
    } else {
      Alert.alert("Error", "Unable to mark no-show. Please try again.");
    }
  }, []);

  const handleReport = useCallback(() => {
    Alert.alert("Report Booking", "Report booking functionality is not yet available");
  }, []);

  const handleCancel = useCallback(() => {
    if (actionHandlersRef.current?.handleCancelBooking) {
      actionHandlersRef.current.handleCancelBooking();
    } else {
      Alert.alert("Error", "Unable to cancel. Please try again.");
    }
  }, []);

  // Define booking actions organized by sections
  const bookingActionsSections = useMemo(() => {
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
          title: "Booking", // This appears in long-press navigation history
          headerBackTitle: monthName, // This shows on the back button
          headerBackButtonDisplayMode: "default",
          headerTitle: "", // Hide the title in the header bar itself
          headerStyle: {
            backgroundColor: "#f2f2f7",
          },
          headerShadowVisible: false,
        }}
      />

      <Stack.Header style={{ shadowColor: "transparent", backgroundColor: "#f2f2f7" }}>
        <Stack.Header.Right>
          {/* Join Meeting Menu - only show if there's a meeting URL */}
          {meetingUrl && (
            <Stack.Header.Menu>
              <Stack.Header.Icon sf="video" />
              <Stack.Header.MenuAction icon="video" onPress={handleJoinMeeting}>
                Join Meeting
              </Stack.Header.MenuAction>
            </Stack.Header.Menu>
          )}

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

      <BookingDetailScreen uid={uid} onActionsReady={handleActionsReady} />
    </>
  );
}
