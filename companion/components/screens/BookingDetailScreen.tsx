import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import * as Clipboard from "expo-clipboard";
import { BookingActionsModal } from "@/components/BookingActionsModal";
import { FullScreenModal } from "@/components/FullScreenModal";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Text as UIText } from "@/components/ui/text";
import { useAuth } from "@/contexts/AuthContext";
import { useCancelBooking } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showInfoAlert, showSuccessAlert } from "@/utils/alerts";
import { type BookingActionsResult, getBookingActions } from "@/utils/booking-actions";
import { openInAppBrowser } from "@/utils/browser";
import { getColors } from "@/constants/colors";

const CopyButton = ({
  text,
  color,
  size = 16,
}: {
  text: string;
  color?: string;
  size?: number;
}) => (
  <AppPressable
    onPress={async () => {
      if (!text) return;
      await Clipboard.setStringAsync(text);
      showSuccessAlert("Copied", "Copied to clipboard");
    }}
    hitSlop={8}
    className="ml-2 justify-center"
  >
    <Ionicons name="copy-outline" size={size} color={color || "#A3A3A3"} />
  </AppPressable>
);

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

// Format date for iOS Calendar style: "Monday, Jan 12, 2026"
const formatDateCalendarStyle = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Format time for iOS Calendar style: "3 PM – 3:30 PM"
const formatTimeCalendarStyle = (startDateString: string, endDateString: string): string => {
  if (!startDateString || !endDateString) return "";
  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "";

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    if (minutes === 0) {
      return `${hour12} ${period}`;
    }
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return `${formatTime(startDate)} – ${formatTime(endDate)}`;
};

// Format duration for display: "30 min" or "1 hr" or "1 hr 30 min"
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return hours === 1 ? "1 hr" : `${hours} hrs`;
  }
  return `${hours} hr ${remainingMinutes} min`;
};

// Calculate duration from start and end times
const calculateDuration = (startDateString: string, endDateString: string): number => {
  if (!startDateString || !endDateString) return 0;
  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
};

const getMeetingUrl = (booking: Booking | null): string | null => {
  if (!booking) return null;

  const videoCallUrl = booking.responses?.videoCallUrl;
  if (typeof videoCallUrl === "string" && videoCallUrl.startsWith("http")) {
    return videoCallUrl;
  }

  const location = booking.location;
  if (typeof location === "string" && location.startsWith("http")) {
    return location;
  }

  return null;
};

export interface BookingDetailScreenProps {
  /**
   * The booking data to display. When null/undefined, shows loading or error state.
   */
  booking: Booking | null | undefined;
  /**
   * Whether the booking data is currently being fetched.
   */
  isLoading: boolean;
  /**
   * Error that occurred while fetching the booking, if any.
   */
  error: Error | null;
  /**
   * Function to refetch the booking data. Used for pull-to-refresh.
   */
  refetch: () => void;
  /**
   * Whether a refetch is currently in progress. Used for RefreshControl.
   */
  isRefetching?: boolean;
  /**
   * Callback to expose internal action handlers to parent component.
   * Used by iOS header menu to trigger actions like reschedule.
   */
  onActionsReady?: (handlers: {
    openRescheduleModal: () => void;
    openEditLocationModal: () => void;
    openAddGuestsModal: () => void;
    openViewRecordingsModal: () => void;
    openMeetingSessionDetailsModal: () => void;
    openMarkNoShowModal: () => void;
    handleCancelBooking: () => void;
  }) => void;
}

export function BookingDetailScreen({
  booking,
  isLoading,
  error,
  refetch,
  isRefetching = false,
  onActionsReady,
}: BookingDetailScreenProps) {
  const router = useRouter();
  const { userInfo } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  // Background for the main screen (grouped list style: gray in light, black in dark)
  const screenBackground = isDark ? theme.background : theme.backgroundMuted;
  // Background for cards/items (white in light, dark gray in dark)
  const cardBackground = isDark ? theme.backgroundSecondary : theme.background;

  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [participantsExpanded, setParticipantsExpanded] = useState(true);

  // Cancel booking mutation
  const cancelBookingMutation = useCancelBooking();
  const isCancelling = cancelBookingMutation.isPending;

  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  // Compute actions using centralized gating
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

  // Cancel booking handler (needs to be defined before useEffect that exposes it)
  const performCancelBooking = useCallback(
    (reason: string) => {
      if (!booking) return;

      cancelBookingMutation.mutate(
        { uid: booking.uid, reason },
        {
          onSuccess: () => {
            showSuccessAlert("Success", "Booking cancelled successfully");
            router.back();
          },
          onError: (err) => {
            console.error("Failed to cancel booking");
            if (__DEV__) {
              const message = err instanceof Error ? err.message : String(err);
              console.debug("[BookingDetailScreen] cancelBooking failed", { message });
            }
            showErrorAlert("Error", "Failed to cancel booking. Please try again.");
          },
        }
      );
    },
    [booking, router, cancelBookingMutation]
  );

  const handleCancelBooking = useCallback(() => {
    if (!booking) return;

    if (Platform.OS === "android" || Platform.OS === "web") {
      setCancellationReason("");
      setShowCancelDialog(true);
    } else {
      Alert.alert("Cancel Booking", `Are you sure you want to cancel "${booking.title}"?`, [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            if (Platform.OS === "ios") {
              Alert.prompt(
                "Cancellation Reason",
                "Please provide a reason for cancelling this booking:",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Cancel Booking",
                    style: "destructive",
                    onPress: (reason?: string) => {
                      performCancelBooking(reason?.trim() || "Cancelled by host");
                    },
                  },
                ],
                "plain-text",
                "",
                "default"
              );
            } else {
              performCancelBooking("Cancelled by host");
            }
          },
        },
      ]);
    }
  }, [booking, performCancelBooking]);

  const handleConfirmCancel = useCallback(() => {
    const reason = cancellationReason.trim() || "Cancelled by host";
    setShowCancelDialog(false);
    setCancellationReason("");
    performCancelBooking(reason);
  }, [cancellationReason, performCancelBooking]);

  const handleCloseCancelDialog = useCallback(() => {
    setShowCancelDialog(false);
    setCancellationReason("");
  }, []);

  const handleReportBooking = useCallback(() => {
    showInfoAlert("Report Booking", "Report booking functionality is not yet available");
  }, []);

  // Navigate to reschedule screen (same pattern as senior's - navigate to screen in same folder)
  const openRescheduleModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/reschedule",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  // Navigate to edit location screen (same pattern as senior's - navigate to screen in same folder)
  const openEditLocationModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/edit-location",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  // Navigate to add guests screen (same pattern as senior's - navigate to screen in same folder)
  const openAddGuestsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/add-guests",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  // Navigate to mark no show screen (same pattern as senior's - navigate to screen in same folder)
  const openMarkNoShowModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/mark-no-show",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  // Navigate to view recordings screen (same pattern as senior's - navigate to screen in same folder)
  const openViewRecordingsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/view-recordings",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  // Navigate to meeting session details screen (same pattern as senior's - navigate to screen in same folder)
  const openMeetingSessionDetailsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/meeting-session-details",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const meetingUrl = useMemo(() => getMeetingUrl(booking ?? null), [booking]);

  const handleJoinMeeting = useCallback(() => {
    if (meetingUrl) {
      openInAppBrowser(meetingUrl, "meeting link");
    }
  }, [meetingUrl]);

  // Expose action handlers to parent component (for iOS header menu)
  useEffect(() => {
    if (booking && onActionsReady) {
      onActionsReady({
        openRescheduleModal,
        openEditLocationModal,
        openAddGuestsModal,
        openViewRecordingsModal,
        openMeetingSessionDetailsModal,
        openMarkNoShowModal,
        handleCancelBooking,
      });
    }
  }, [
    booking,
    onActionsReady,
    openRescheduleModal,
    openEditLocationModal,
    openAddGuestsModal,
    openViewRecordingsModal,
    openMeetingSessionDetailsModal,
    handleCancelBooking,
    openMarkNoShowModal,
  ]);

  const dropdownActions = useMemo(() => {
    if (!booking) return [];

    type DropdownAction = {
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      onPress: () => void;
      visible: boolean;
      variant?: "default" | "destructive";
    };

    const allActions: DropdownAction[] = [
      {
        label: "Reschedule Booking",
        icon: "calendar-outline",
        onPress: openRescheduleModal,
        visible: actions.reschedule.visible && actions.reschedule.enabled,
      },
      {
        label: "Edit Location",
        icon: "location-outline",
        onPress: openEditLocationModal,
        visible: actions.changeLocation.visible && actions.changeLocation.enabled,
      },
      {
        label: "Add Guests",
        icon: "people-outline",
        onPress: openAddGuestsModal,
        visible: actions.addGuests.visible && actions.addGuests.enabled,
      },
      {
        label: "View Recordings",
        icon: "videocam-outline",
        onPress: openViewRecordingsModal,
        visible: actions.viewRecordings.visible && actions.viewRecordings.enabled,
      },
      {
        label: "Meeting Session Details",
        icon: "information-circle-outline",
        onPress: openMeetingSessionDetailsModal,
        visible: actions.meetingSessionDetails.visible && actions.meetingSessionDetails.enabled,
      },
      {
        label: "Mark as No-Show",
        icon: "eye-off-outline",
        onPress: openMarkNoShowModal,
        visible: actions.markNoShow.visible && actions.markNoShow.enabled,
      },
      {
        label: "Report Booking",
        icon: "flag-outline",
        onPress: handleReportBooking,
        visible: true,
        variant: "destructive",
      },
      {
        label: "Cancel Event",
        icon: "close-circle-outline",
        onPress: handleCancelBooking,
        visible: actions.cancel.visible && actions.cancel.enabled,
        variant: "destructive",
      },
    ];

    return allActions.filter((action) => action.visible);
  }, [
    booking,
    actions,
    openRescheduleModal,
    openEditLocationModal,
    openAddGuestsModal,
    openViewRecordingsModal,
    openMeetingSessionDetailsModal,
    openMarkNoShowModal,
    handleReportBooking,
    handleCancelBooking,
  ]);

  const destructiveStartIndex = dropdownActions.findIndex(
    (action) => action.variant === "destructive"
  );

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: screenBackground }}
      >
        <ActivityIndicator size="large" color={theme.text} />
        <Text className="mt-4 text-base" style={{ color: theme.textSecondary }}>
          Loading booking...
        </Text>
      </View>
    );
  }

  if (error || !booking) {
    const errorMessage = error?.message || "Booking not found";
    return (
      <View
        className="flex-1 items-center justify-center p-5"
        style={{ backgroundColor: screenBackground }}
      >
        <Ionicons name="alert-circle" size={64} color={theme.error} />
        <Text className="mb-2 mt-4 text-center text-xl font-bold" style={{ color: theme.text }}>
          {errorMessage}
        </Text>
        <AppPressable
          className="mt-6 rounded-lg px-6 py-3"
          style={{ backgroundColor: isDark ? "#FFFFFF" : "#000000" }}
          onPress={() => router.back()}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: isDark ? "#000000" : "#FFFFFF" }}
          >
            Go Back
          </Text>
        </AppPressable>
      </View>
    );
  }

  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";
  const dateFormatted = formatDateCalendarStyle(startTime);
  const timeFormatted = formatTimeCalendarStyle(startTime, endTime);

  const isRecurring =
    booking.recurringEventId || (booking as { recurringBookingUid?: string }).recurringBookingUid;

  const duration =
    (booking as { duration?: number }).duration || calculateDuration(startTime, endTime);
  const durationFormatted = duration > 0 ? formatDuration(duration) : null;

  const eventTypeSlug = booking.eventType?.slug;

  const hostsCount = booking.hosts?.length || (booking.user ? 1 : 0);
  const attendeesCount = booking.attendees?.length || 0;
  const guestsCount = (booking as { guests?: string[] }).guests?.length || 0;
  const totalParticipants = hostsCount + attendeesCount + guestsCount;

  const isPastBooking = new Date(endTime) < new Date();
  const normalizedStatus = booking.status.toLowerCase();

  const getAttendeeStatusIcon = (attendee: { noShow?: boolean; absent?: boolean }) => {
    const isNoShow = attendee.noShow || attendee.absent;

    if (isPastBooking && isNoShow) {
      return {
        name: "close-circle" as const,
        color: "#FF3B30",
        label: "No-show",
      };
    }

    if (normalizedStatus === "pending") {
      return {
        name: "help-circle" as const,
        color: "#A3A3A3",
        label: "Pending",
      };
    }

    if (normalizedStatus === "cancelled" || normalizedStatus === "rejected") {
      return {
        name: "close-circle-outline" as const,
        color: "#A3A3A3",
        label: null,
      };
    }

    return { name: "checkmark-circle" as const, color: "#34C759", label: null };
  };

  return (
    <>
      {/* This header right is used for non iOS platforms only */}
      {Platform.OS !== "ios" && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <HeaderButtonWrapper side="right">
                <View className="flex-row items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable
                        className="mr-2 h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: cardBackground,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
                      </Pressable>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      insets={contentInsets}
                      sideOffset={8}
                      className="w-52"
                      align="end"
                    >
                      {dropdownActions.map((action, index) => (
                        <React.Fragment key={action.label}>
                          {index === destructiveStartIndex && destructiveStartIndex > 0 && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuItem variant={action.variant} onPress={action.onPress}>
                            <Ionicons
                              name={action.icon}
                              size={18}
                              color={
                                action.variant === "destructive"
                                  ? theme.destructive
                                  : isDark
                                    ? "#FFFFFF"
                                    : "#374151"
                              }
                              style={{ marginRight: 8 }}
                            />
                            <UIText
                              className={action.variant === "destructive" ? "text-destructive" : ""}
                            >
                              {action.label}
                            </UIText>
                          </DropdownMenuItem>
                        </React.Fragment>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {meetingUrl && (
                    <Pressable
                      className="h-9 items-center justify-center rounded-full px-4"
                      style={{ backgroundColor: theme.text }}
                      onPress={handleJoinMeeting}
                    >
                      <Text
                        className="text-[14px] font-semibold"
                        style={{ color: theme.background }}
                      >
                        Join
                      </Text>
                    </Pressable>
                  )}
                </View>
              </HeaderButtonWrapper>
            ),
          }}
        />
      )}
      <View className="flex-1" style={{ backgroundColor: screenBackground }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {/* Title Section - iOS Calendar Style */}
          <View className="mb-8">
            {/* Meeting Title */}
            <Text
              className="mb-4 text-[26px] font-semibold leading-tight"
              style={{ letterSpacing: -0.3, color: theme.text }}
              selectable
            >
              {booking.title}
            </Text>

            {eventTypeSlug || durationFormatted ? (
              <View className="mb-3 flex-row items-center">
                {eventTypeSlug ? (
                  <Text className="text-[15px]" style={{ color: theme.textSecondary }} selectable>
                    {eventTypeSlug}
                  </Text>
                ) : null}
                {eventTypeSlug && durationFormatted ? (
                  <Text className="mx-2 text-[15px]" style={{ color: theme.textSecondary }}>
                    •
                  </Text>
                ) : null}
                {durationFormatted ? (
                  <View
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: isDark
                        ? theme.backgroundSecondary
                        : theme.backgroundEmphasis,
                    }}
                  >
                    <Text
                      className="text-[13px] font-medium"
                      style={{ color: isDark ? "#FFFFFF" : theme.text }}
                    >
                      {durationFormatted}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text className="mb-0.5 text-[17px]" style={{ color: theme.text }} selectable>
              {dateFormatted}
            </Text>
            <Text className="mb-0.5 text-[17px]" style={{ color: theme.text }} selectable>
              {timeFormatted}
            </Text>

            {isRecurring ? (
              <Text className="mt-0.5 text-[17px]" style={{ color: theme.destructive }}>
                Repeats weekly
              </Text>
            ) : null}
          </View>

          {/* Participants Card - iOS Calendar Style (Expandable) */}
          <View
            className="mb-4 overflow-hidden rounded-xl"
            style={{ backgroundColor: cardBackground }}
          >
            <AppPressable onPress={() => setParticipantsExpanded(!participantsExpanded)}>
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <Text className="text-[17px]" style={{ color: theme.text }}>
                  Participants
                </Text>
                <View className="flex-row items-center">
                  <Text className="mr-1 text-[17px]" style={{ color: theme.textSecondary }}>
                    {totalParticipants}
                  </Text>
                  <Ionicons
                    name={participantsExpanded ? "chevron-down" : "chevron-forward"}
                    size={18}
                    color={theme.textSecondary}
                  />
                </View>
              </View>
            </AppPressable>

            {participantsExpanded ? (
              <View
                className="px-4 py-2.5"
                style={{ borderTopWidth: 1, borderTopColor: theme.border }}
              >
                {/* Hosts */}
                {booking.hosts && booking.hosts.length > 0 ? (
                  booking.hosts.map((host, index) => (
                    <View
                      key={host.email || `host-${index}`}
                      className="flex-row items-center py-2"
                      style={index > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : {}}
                    >
                      <Ionicons name="star" size={18} color="#FFD60A" />
                      <Text
                        className="ml-2.5 flex-1 text-[15px]"
                        style={{ color: theme.text }}
                        numberOfLines={1}
                      >
                        {host.name || host.email || "Host"}
                        <Text style={{ color: theme.textSecondary }}> (Organizer)</Text>
                      </Text>
                      <CopyButton text={host.name || host.email || "Host"} />
                    </View>
                  ))
                ) : booking.user ? (
                  <View className="flex-row items-center py-2">
                    <Ionicons name="star" size={18} color="#FFD60A" />
                    <Text
                      className="ml-2.5 flex-1 text-[15px]"
                      style={{ color: theme.text }}
                      numberOfLines={1}
                    >
                      {booking.user.name || booking.user.email}
                      <Text style={{ color: theme.textSecondary }}> (Organizer)</Text>
                    </Text>
                    <CopyButton text={booking.user.name || booking.user.email} />
                  </View>
                ) : null}

                {/* Attendees */}
                {booking.attendees?.map((attendee, index) => {
                  const statusIcon = getAttendeeStatusIcon(attendee);
                  return (
                    <View
                      key={attendee.email}
                      className="flex-row items-center py-2"
                      style={
                        index > 0 || booking.hosts?.length || booking.user
                          ? { borderTopWidth: 1, borderTopColor: theme.border }
                          : {}
                      }
                    >
                      <Ionicons name={statusIcon.name} size={20} color={statusIcon.color} />
                      <Text
                        className="ml-2.5 flex-1 text-[15px]"
                        style={{ color: theme.text }}
                        numberOfLines={1}
                      >
                        {attendee.name || attendee.email}
                        {statusIcon.label ? (
                          <Text style={{ color: statusIcon.color }}> ({statusIcon.label})</Text>
                        ) : null}
                      </Text>
                      <CopyButton text={attendee.name || attendee.email} />
                    </View>
                  );
                })}

                {/* Guests */}
                {/* Guests */}
                {(booking as { guests?: string[] }).guests?.map((guestEmail, index) => (
                  <View
                    key={guestEmail}
                    className="flex-row items-center py-2"
                    style={
                      index > 0 ||
                      booking.attendees?.length ||
                      booking.hosts?.length ||
                      booking.user
                        ? { borderTopWidth: 1, borderTopColor: theme.border }
                        : {}
                    }
                  >
                    <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
                    <Text
                      className="ml-2.5 flex-1 text-[15px]"
                      style={{ color: theme.textSecondary }}
                      numberOfLines={1}
                    >
                      {guestEmail}
                      <Text style={{ color: theme.textSecondary }}> (Guest)</Text>
                    </Text>
                    <CopyButton text={guestEmail} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* Custom Fields Card (if available) */}
          {(() => {
            if (!booking.bookingFieldsResponses) return null;

            const excludedKeys = [
              "location",
              "guests",
              "rescheduledReason",
              "rescheduleReason",
              "email",
              "name",
              "notes",
              "description",
              "additionalNotes",
            ];

            const displayableEntries = Object.entries(booking.bookingFieldsResponses).filter(
              ([key, value]) => {
                if (excludedKeys.includes(key)) return false;

                if (value === null || value === undefined || value === "") return false;

                if (Array.isArray(value) && value.length === 0) return false;

                if (typeof value === "object" && !Array.isArray(value) && value !== null) {
                  const obj = value as Record<string, unknown>;
                  if ("value" in obj && "optionValue" in obj) return false;
                  if (Object.keys(obj).length === 0) return false;
                }

                return true;
              }
            );

            if (displayableEntries.length === 0) return null;

            return (
              <View
                className="mb-4 overflow-hidden rounded-xl"
                style={{ backgroundColor: cardBackground }}
              >
                <View className="px-4 py-3.5">
                  <Text
                    className="mb-2.5 text-[13px] font-medium uppercase tracking-wide"
                    style={{ color: theme.textSecondary }}
                  >
                    Booking Details
                  </Text>
                  {displayableEntries.map(([key, value], index) => {
                    let displayValue: string;
                    if (typeof value === "string") {
                      displayValue = value;
                    } else if (Array.isArray(value)) {
                      displayValue = value.join(", ");
                    } else if (typeof value === "boolean") {
                      displayValue = value ? "Yes" : "No";
                    } else if (typeof value === "number") {
                      displayValue = String(value);
                    } else {
                      return null;
                    }

                    const displayKey = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())
                      .trim();

                    return (
                      <View
                        key={key}
                        className="py-2"
                        style={index > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : {}}
                      >
                        <Text className="mb-0.5 text-[13px]" style={{ color: theme.textSecondary }}>
                          {displayKey}
                        </Text>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[17px] flex-1" style={{ color: theme.text }}>
                            {displayValue}
                          </Text>
                          <CopyButton text={displayValue} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* Notes Card (if available) */}
          {booking.description ? (
            <View
              className="mb-4 overflow-hidden rounded-xl"
              style={{ backgroundColor: cardBackground }}
            >
              <View className="px-4 py-3.5">
                <Text
                  className="mb-1.5 text-[13px] font-medium uppercase tracking-wide"
                  style={{ color: theme.textSecondary }}
                >
                  Notes
                </Text>
                <View className="flex-row items-start justify-between">
                  <Text className="text-[17px] leading-6 flex-1 mr-2" style={{ color: theme.text }}>
                    {booking.description}
                  </Text>
                  <CopyButton text={booking.description} />
                </View>
              </View>
            </View>
          ) : null}

          {/* Rescheduling Info Card (if applicable) */}
          {(booking.rescheduledFromUid ||
            booking.rescheduledToUid ||
            booking.reschedulingReason ||
            booking.fromReschedule) && (
            <View
              className="mb-4 overflow-hidden rounded-xl"
              style={{ backgroundColor: cardBackground }}
            >
              <View className="px-4 py-3.5">
                <Text
                  className="mb-2.5 text-[13px] font-medium uppercase tracking-wide"
                  style={{ color: theme.textSecondary }}
                >
                  Rescheduling Info
                </Text>

                {(booking.rescheduledFromUid || booking.fromReschedule) && (
                  <View className="py-2">
                    <Text className="text-[17px]" style={{ color: theme.text }}>
                      Rescheduled from previous booking
                    </Text>
                  </View>
                )}

                {booking.rescheduledToUid && (
                  <View
                    className="py-2"
                    style={{ borderTopWidth: 1, borderTopColor: theme.border }}
                  >
                    <Text className="text-[17px]" style={{ color: theme.text }}>
                      Rescheduled to new booking
                    </Text>
                  </View>
                )}

                {booking.reschedulingReason && (
                  <View
                    className="py-2"
                    style={
                      booking.rescheduledFromUid ||
                      booking.rescheduledToUid ||
                      booking.fromReschedule
                        ? { borderTopWidth: 1, borderTopColor: theme.border }
                        : {}
                    }
                  >
                    <Text className="mb-0.5 text-[13px]" style={{ color: theme.textSecondary }}>
                      Reason
                    </Text>
                    <View className="flex-row items-start justify-between">
                      <Text className="text-[17px] flex-1" style={{ color: theme.text }}>
                        {booking.reschedulingReason}
                      </Text>
                      <CopyButton text={booking.reschedulingReason} />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Cancellation Info Card (if cancelled) */}
          {normalizedStatus === "cancelled" &&
            (booking.cancellationReason || booking.cancelledByEmail || booking.absentHost) && (
              <View
                className="mb-4 overflow-hidden rounded-xl"
                style={{ backgroundColor: cardBackground }}
              >
                <View className="px-4 py-3.5">
                  <Text className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-[#FF3B30]">
                    Cancellation Details
                  </Text>

                  {booking.cancellationReason && (
                    <View className="py-2">
                      <Text className="mb-0.5 text-[13px]" style={{ color: theme.textSecondary }}>
                        Reason
                      </Text>
                      <View className="flex-row items-start justify-between">
                        <Text className="text-[17px] flex-1" style={{ color: theme.text }}>
                          {booking.cancellationReason}
                        </Text>
                        <CopyButton text={booking.cancellationReason} />
                      </View>
                    </View>
                  )}

                  {booking.cancelledByEmail && (
                    <View
                      className="py-2"
                      style={
                        booking.cancellationReason
                          ? { borderTopWidth: 1, borderTopColor: theme.border }
                          : {}
                      }
                    >
                      <Text className="mb-0.5 text-[13px]" style={{ color: theme.textSecondary }}>
                        Cancelled by
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[17px] flex-1" style={{ color: theme.text }}>
                          {booking.cancelledByEmail}
                        </Text>
                        <CopyButton text={booking.cancelledByEmail} />
                      </View>
                    </View>
                  )}

                  {booking.absentHost && (
                    <View
                      className="flex-row items-center py-2"
                      style={
                        booking.cancellationReason || booking.cancelledByEmail
                          ? { borderTopWidth: 1, borderTopColor: theme.border }
                          : {}
                      }
                    >
                      <Ionicons name="warning" size={18} color="#FF9500" />
                      <Text className="ml-2 text-[17px]" style={{ color: theme.text }}>
                        Host was absent
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
        </ScrollView>

        {/* Booking Actions Modal */}
        <BookingActionsModal
          visible={showActionsModal}
          onClose={() => setShowActionsModal(false)}
          booking={booking}
          actions={actions}
          onReschedule={openRescheduleModal}
          onEditLocation={openEditLocationModal}
          onAddGuests={openAddGuestsModal}
          onViewRecordings={openViewRecordingsModal}
          onMeetingSessionDetails={openMeetingSessionDetailsModal}
          onMarkNoShow={openMarkNoShowModal}
          onReportBooking={() => {
            Alert.alert("Report Booking", "Report booking functionality is not yet available");
          }}
          onCancelBooking={handleCancelBooking}
        />

        {/* Cancelling overlay */}
        {isCancelling ? (
          <View className="absolute inset-0 items-center justify-center bg-black/50">
            <View className="rounded-2xl px-8 py-6" style={{ backgroundColor: cardBackground }}>
              <ActivityIndicator size="large" color={theme.text} />
              <Text className="mt-3 text-base font-medium" style={{ color: theme.textSecondary }}>
                Cancelling booking...
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Web/Extension: Cancel Event Modal */}
      {Platform.OS === "web" && (
        <FullScreenModal
          visible={showCancelDialog}
          animationType="fade"
          onRequestClose={handleCloseCancelDialog}
        >
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <View className="p-6">
                <View className="flex-row">
                  {/* Danger icon */}
                  <View className="mr-3 self-start rounded-full bg-red-50 p-2 dark:bg-red-900/30">
                    <Ionicons name="alert-circle" size={20} color={theme.destructive} />
                  </View>

                  {/* Title and description */}
                  <View className="flex-1">
                    <Text className="mb-2 text-xl font-semibold text-gray-900">Cancel Event</Text>
                    <Text className="text-sm leading-5 text-gray-600">
                      Are you sure you want to cancel "{booking?.title}"? Cancellation reason will
                      be shared with guests.
                    </Text>

                    {/* Reason Input */}
                    <View className="mt-4">
                      <Text className="mb-2 text-sm font-medium text-gray-700">
                        Reason for cancellation
                      </Text>
                      <TextInput
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900"
                        placeholder="Why are you cancelling?"
                        placeholderTextColor="#9CA3AF"
                        value={cancellationReason}
                        onChangeText={setCancellationReason}
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
                  style={{ backgroundColor: "#111827" }}
                  onPress={handleConfirmCancel}
                >
                  <Text className="text-center text-base font-medium text-white">Cancel Event</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5"
                  onPress={handleCloseCancelDialog}
                >
                  <Text className="text-center text-base font-medium text-gray-700">Nevermind</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </FullScreenModal>
      )}

      {/* Cancel Event AlertDialog (Android only) */}
      {Platform.OS === "android" && (
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
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

            <View>
              <UIText className="mb-2 text-sm font-medium">Reason for cancellation</UIText>
              <TextInput
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2.5 text-base text-[#111827]"
                placeholder="Why are you cancelling?"
                placeholderTextColor="#9CA3AF"
                value={cancellationReason}
                onChangeText={setCancellationReason}
                autoFocus
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </View>

            <AlertDialogFooter>
              <AlertDialogCancel onPress={handleCloseCancelDialog}>
                <UIText>Nevermind</UIText>
              </AlertDialogCancel>
              <AlertDialogAction onPress={handleConfirmCancel}>
                <UIText className="text-white">Cancel event</UIText>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
