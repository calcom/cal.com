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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { AppPressable } from "@/components/AppPressable";
import { BookingActionsModal } from "@/components/BookingActionsModal";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import { SvgImage } from "@/components/SvgImage";
import { useAuth } from "@/contexts/AuthContext";
import { useCancelBooking } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";
import { type BookingActionsResult, getBookingActions } from "@/utils/booking-actions";
import { openInAppBrowser } from "@/utils/browser";
import { defaultLocations, getDefaultLocationIconUrl } from "@/utils/defaultLocations";
import { formatAppIdToDisplayName } from "@/utils/formatters";
import { getAppIconUrl } from "@/utils/getAppIconUrl";

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

// Format date: "Tuesday, November 25, 2025"
const formatDateFull = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Format time: "9:40pm - 10:00pm"
const formatTime12Hour = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const minStr = minutes.toString().padStart(2, "0");
  return `${hour12}:${minStr}${period}`;
};

// Get user's local timezone for display
const getTimezone = (): string => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone || "";
};

// Get initials from a name(e.g., "Keith Williams" -> "KW", "Dhairyashil Shinde" -> "DS")
const getInitials = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  // Get first letter of first name and first letter of last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Get location provider info
const getLocationProvider = (location: string | undefined, metadata?: Record<string, unknown>) => {
  // Check metadata for videoCallUrl first
  const videoCallUrl = metadata?.videoCallUrl;
  const locationToCheck = videoCallUrl || location;

  if (!locationToCheck) return null;

  // Check if it's a video call URL
  if (typeof locationToCheck === "string" && locationToCheck.startsWith("http")) {
    // Try to detect provider from URL
    if (locationToCheck.includes("cal.com/video") || locationToCheck.includes("cal-video")) {
      const iconUrl = getAppIconUrl("daily_video", "cal-video");
      return {
        label: "Cal Video",
        iconUrl: iconUrl || "https://app.cal.com/app-store/dailyvideo/icon.svg",
        url: locationToCheck,
      };
    }
    // Check for other video providers by URL pattern
    const videoProviders = [
      { pattern: /zoom\.us/, label: "Zoom", type: "zoom_video", appId: "zoom" },
      {
        pattern: /meet\.google\.com/,
        label: "Google Meet",
        type: "google_video",
        appId: "google-meet",
      },
      {
        pattern: /teams\.microsoft\.com/,
        label: "Microsoft Teams",
        type: "office365_video",
        appId: "msteams",
      },
    ];

    for (const provider of videoProviders) {
      if (provider.pattern.test(locationToCheck)) {
        const iconUrl = getAppIconUrl(provider.type, provider.appId);
        return {
          label: provider.label,
          iconUrl: iconUrl,
          url: locationToCheck,
        };
      }
    }

    // Generic link meeting
    const linkIconUrl = getDefaultLocationIconUrl("link") || "https://app.cal.com/link.svg";
    return {
      label: "Link Meeting",
      iconUrl: linkIconUrl,
      url: locationToCheck,
    };
  }

  // Check if it's an integration location (e.g., "integrations:zoom", "integrations:cal-video")
  if (typeof locationToCheck === "string" && locationToCheck.startsWith("integrations:")) {
    const appId = locationToCheck.replace("integrations:", "");
    const iconUrl = getAppIconUrl("", appId);

    if (iconUrl) {
      return {
        label: formatAppIdToDisplayName(appId),
        iconUrl: iconUrl,
        url: null,
      };
    }
  }

  // Check if it's a default location type
  const defaultLocation = defaultLocations.find((loc) => loc.type === locationToCheck);
  if (defaultLocation) {
    return {
      label: defaultLocation.label,
      iconUrl: defaultLocation.iconUrl,
      url: null,
    };
  }

  // Fallback: return as plain text location
  return {
    label: locationToCheck as string,
    iconUrl: null,
    url: null,
  };
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

  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

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
            Alert.alert("Success", "Booking cancelled successfully", [
              {
                text: "OK",
                onPress: () => router.back(),
              },
            ]);
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

    if (Platform.OS === "android") {
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
    Alert.alert("Report Booking", "Report booking functionality is not yet available");
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

  const handleJoinMeeting = () => {
    if (!booking?.location) return;

    const provider = getLocationProvider(booking.location);
    if (provider?.url) {
      openInAppBrowser(provider.url, "meeting link");
    }
  };

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
      <View className="flex-1 items-center justify-center bg-[#f8f9fa]">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-gray-500">Loading booking...</Text>
      </View>
    );
  }

  if (error || !booking) {
    const errorMessage = error?.message || "Booking not found";
    return (
      <View className="flex-1 items-center justify-center bg-[#f8f9fa] p-5">
        <Ionicons name="alert-circle" size={64} color="#800020" />
        <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
          {errorMessage}
        </Text>
        <AppPressable className="mt-6 rounded-lg bg-black px-6 py-3" onPress={() => router.back()}>
          <Text className="text-base font-semibold text-white">Go Back</Text>
        </AppPressable>
      </View>
    );
  }

  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";
  const dateFormatted = formatDateFull(startTime);
  const timeFormatted = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
  const timezone = getTimezone();
  const locationProvider = getLocationProvider(booking.location, booking.responses);

  return (
    <>
      {/* This header right is used for non iOS platforms only */}
      {Platform.OS !== "ios" && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <HeaderButtonWrapper side="right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Pressable className="h-10 w-10 items-center justify-center rounded-full">
                      <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
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
                            color={action.variant === "destructive" ? "#800020" : "#374151"}
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
              </HeaderButtonWrapper>
            ),
          }}
        />
      )}
      <View className="flex-1 bg-[#f8f9fa]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {/* Title */}
          <View className="mb-3">
            <Text className="mb-2 text-2xl font-semibold text-[#333]">{booking.title}</Text>
            <Text className="text-base text-[#666]">
              {dateFormatted} {timeFormatted} ({timezone})
            </Text>
          </View>

          {/* Who Section */}
          <View className="mb-2 rounded-2xl bg-white p-6">
            <Text className="mb-4 text-base font-medium text-[#666]">Who</Text>
            {/* Show host from user field or hosts array */}
            {booking.user || (booking.hosts && booking.hosts.length > 0) ? (
              <View className="mb-4">
                {booking.user ? (
                  <View className="flex-row items-start">
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-black">
                      <Text className="text-base font-semibold text-white">
                        {getInitials(booking.user.name)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <View className="mb-1 flex-row flex-wrap items-center">
                        <Text className="text-base font-medium text-[#333]">
                          {booking.user.name}
                        </Text>
                        <View className="ml-2 rounded bg-[#007AFF] px-2 py-0.5">
                          <Text className="text-xs font-medium text-white">host</Text>
                        </View>
                      </View>
                      <Text className="text-sm text-[#666]">{booking.user.email}</Text>
                    </View>
                  </View>
                ) : booking.hosts && booking.hosts.length > 0 ? (
                  booking.hosts.map((host, hostIndex) => (
                    <View
                      key={host.email ?? host.name}
                      className={`flex-row items-start ${hostIndex > 0 ? "mt-4" : ""}`}
                    >
                      <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-black">
                        <Text className="text-base font-semibold text-white">
                          {getInitials(host.name || "Host")}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <View className="mb-1 flex-row flex-wrap items-center">
                          <Text className="text-base font-medium text-[#333]">
                            {host.name || "Host"}
                          </Text>
                          <View className="ml-2 rounded bg-[#007AFF] px-2 py-0.5">
                            <Text className="text-xs font-medium text-white">host</Text>
                          </View>
                        </View>
                        {host.email && <Text className="text-sm text-[#666]">{host.email}</Text>}
                      </View>
                    </View>
                  ))
                ) : null}
              </View>
            ) : null}
            {booking.attendees && booking.attendees.length > 0 ? (
              <View>
                {booking.attendees.map((attendee, index) => {
                  const isNoShow =
                    (attendee as { noShow?: boolean; absent?: boolean }).noShow === true ||
                    (attendee as { noShow?: boolean; absent?: boolean }).absent === true;
                  return (
                    <View
                      key={attendee.email}
                      className={`flex-row items-start ${index > 0 ? "mt-4" : ""}`}
                    >
                      <View
                        className={`mr-3 h-12 w-12 items-center justify-center rounded-full ${
                          isNoShow ? "bg-[#800020]" : "bg-black"
                        }`}
                      >
                        <Text className="text-base font-semibold text-white">
                          {getInitials(attendee.name)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <View className="mb-1 flex-row items-center">
                          <Text
                            className={`text-base font-medium ${
                              isNoShow ? "text-[#800020]" : "text-[#333]"
                            }`}
                          >
                            {attendee.name}
                          </Text>
                          {isNoShow && (
                            <View className="ml-2 flex-row items-center rounded-full bg-[#FEE2E2] px-2 py-0.5">
                              <Ionicons name="eye-off" size={12} color="#800020" />
                              <Text className="ml-1 text-xs font-medium text-[#800020]">
                                No-show
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className={`text-sm ${isNoShow ? "text-[#800020]" : "text-[#666]"}`}>
                          {attendee.email}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Where Section */}
          {locationProvider ? (
            <View className="mb-2 rounded-2xl bg-white p-6">
              <Text className="mb-4 text-base font-medium text-[#666]">Where</Text>
              {locationProvider.url ? (
                <AppPressable
                  onPress={handleJoinMeeting}
                  className="flex-row flex-wrap items-center"
                >
                  {locationProvider.iconUrl ? (
                    <SvgImage
                      uri={locationProvider.iconUrl}
                      width={20}
                      height={20}
                      style={{ marginRight: 8 }}
                    />
                  ) : null}
                  <Text className="text-base text-[#007AFF]">{locationProvider.label}: </Text>
                  <Text className="flex-1 text-base text-[#007AFF]" numberOfLines={1}>
                    {locationProvider.url}
                  </Text>
                </AppPressable>
              ) : (
                <View className="flex-row items-center">
                  {locationProvider.iconUrl ? (
                    <SvgImage
                      uri={locationProvider.iconUrl}
                      width={20}
                      height={20}
                      style={{ marginRight: 8 }}
                    />
                  ) : null}
                  <Text className="text-base text-[#333]">{locationProvider.label}</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Recurring Event Section */}
          {booking.recurringEventId ||
          (booking as { recurringBookingUid?: string }).recurringBookingUid ? (
            <View className="mb-2 rounded-2xl bg-white p-6">
              <Text className="text-base font-medium text-[#666]">
                This is part of a recurring event
              </Text>
            </View>
          ) : null}

          {/* Description Section */}
          {booking.description ? (
            <View className="mb-2 rounded-2xl bg-white p-6">
              <Text className="mb-2 text-base font-medium text-[#666]">Description</Text>
              <Text className="text-base leading-6 text-[#666]">{booking.description}</Text>
            </View>
          ) : null}

          {/* Join Meeting Button */}
          {locationProvider?.url ? (
            <AppPressable
              onPress={handleJoinMeeting}
              className="mb-2 flex-row items-center justify-center rounded-lg bg-black px-6 py-4"
            >
              {locationProvider.iconUrl ? (
                <SvgImage
                  uri={locationProvider.iconUrl}
                  width={20}
                  height={20}
                  style={{ marginRight: 8 }}
                />
              ) : null}
              <Text className="text-base font-semibold text-white">
                Join {locationProvider.label}
              </Text>
            </AppPressable>
          ) : null}
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
        {isCancelling && (
          <View className="absolute inset-0 items-center justify-center bg-black/50">
            <View className="rounded-2xl bg-white px-8 py-6">
              <ActivityIndicator size="large" color="#000" />
              <Text className="mt-3 text-base font-medium text-gray-700">
                Cancelling booking...
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Cancel Event AlertDialog (Android only) */}
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
    </>
  );
}
