import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import * as Clipboard from "expo-clipboard";
import { showSuccessAlert } from "@/utils/alerts";
import { useCancelBooking } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

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

// Format date for iOS Calendar style: "Thursday, 25 Dec 2025"
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

// Format time for iOS Calendar style: "11:30 AM - 12 PM"
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
}: BookingDetailScreenProps): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#000000" : "#f2f2f7",
    cardBackground: isDark ? "#171717" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    textSecondary: isDark ? "#A3A3A3" : "#A3A3A3",
    textTertiary: isDark ? "#636366" : "#636366",
    border: isDark ? "#4D4D4D" : "#E5E5EA",
    destructive: isDark ? "#FF453A" : "#800020",
    badge: isDark ? "#4D4D4D" : "#E5E5EA",
  };

  const [participantsExpanded, setParticipantsExpanded] = useState(true);

  // Cancel booking mutation
  const cancelBookingMutation = useCancelBooking();
  const isCancelling = cancelBookingMutation.isPending;

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
              console.debug("[BookingDetailScreen.ios] cancelBooking failed", {
                message,
              });
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

    Alert.alert("Cancel Booking", `Are you sure you want to cancel "${booking.title}"?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => {
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
        },
      },
    ]);
  }, [booking, performCancelBooking]);

  const openRescheduleModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/reschedule",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openEditLocationModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/edit-location",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openAddGuestsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/add-guests",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openMarkNoShowModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/mark-no-show",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openViewRecordingsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/view-recordings",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openMeetingSessionDetailsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/meeting-session-details",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

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

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color={colors.text} />
        <Text className="mt-4 text-base" style={{ color: colors.textSecondary }}>
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
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="mb-2 mt-4 text-center text-xl font-bold" style={{ color: colors.text }}>
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

  const duration = booking.duration || calculateDuration(startTime, endTime);
  const durationFormatted = duration > 0 ? formatDuration(duration) : null;

  const eventTypeSlug = booking.eventType?.slug;

  const hostsCount = booking.hosts?.length || (booking.user ? 1 : 0);
  const attendeesCount = booking.attendees?.length || 0;
  const guestsCount = booking.guests?.length || 0;
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Title Section - iOS Calendar Style */}
        <View className="mb-8">
          {/* Meeting Title */}
          {/* Meeting Title */}
          <Text
            className="mb-4 text-[26px] font-semibold leading-tight"
            style={{ letterSpacing: -0.3, color: colors.text }}
            selectable
          >
            {booking.title}
          </Text>

          {/* Event Type Slug and Duration Badge */}
          {(eventTypeSlug || durationFormatted) && (
            <View className="mb-3 flex-row items-center">
              {eventTypeSlug && (
                <Text className="text-[15px]" style={{ color: colors.textSecondary }}>
                  {eventTypeSlug}
                </Text>
              )}
              {eventTypeSlug && durationFormatted && (
                <Text className="mx-2 text-[15px]" style={{ color: colors.textSecondary }}>
                  •
                </Text>
              )}
              {durationFormatted && (
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: isDark ? "#171717" : colors.badge }}
                >
                  <Text
                    className="text-[13px] font-medium"
                    style={{ color: isDark ? "#FFFFFF" : colors.textTertiary }}
                  >
                    {durationFormatted}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Date */}
          <Text className="mb-0.5 text-[17px]" style={{ color: colors.text }}>
            {dateFormatted}
          </Text>

          {/* Time */}
          <Text className="mb-0.5 text-[17px]" style={{ color: colors.text }}>
            {timeFormatted}
          </Text>

          {/* Recurring indicator */}
          {isRecurring && (
            <Text className="mt-0.5 text-[17px]" style={{ color: colors.destructive }}>
              Repeats weekly
            </Text>
          )}
        </View>

        {/* Participants Card - iOS Calendar Style (Expandable) */}
        <View
          className="mb-4 overflow-hidden rounded-xl"
          style={{ backgroundColor: colors.cardBackground }}
        >
          <AppPressable
            className="flex-row items-center justify-between px-4 py-3.5"
            onPress={() => setParticipantsExpanded(!participantsExpanded)}
          >
            <Text className="text-[17px]" style={{ color: colors.text }}>
              Participants
            </Text>
            <View className="flex-row items-center">
              <Text className="mr-1 text-[17px]" style={{ color: colors.textSecondary }}>
                {totalParticipants}
              </Text>
              <Ionicons
                name={participantsExpanded ? "chevron-down" : "chevron-forward"}
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </AppPressable>

          {/* Participants list - only show when expanded */}
          {participantsExpanded && (
            <View
              className="px-4 py-2.5"
              style={{ borderTopWidth: 1, borderTopColor: colors.border }}
            >
              {/* Hosts */}
              {booking.hosts && booking.hosts.length > 0
                ? booking.hosts.map((host, index) => (
                    <View
                      key={host.email || `host-${index}`}
                      className="flex-row items-center py-2"
                      style={index > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : {}}
                    >
                      <Ionicons name="star" size={18} color="#FFD60A" />
                      <Text
                        className="ml-2.5 flex-1 text-[15px]"
                        style={{ color: colors.text }}
                        numberOfLines={1}
                      >
                        {host.name || host.email || "Host"}
                        <Text style={{ color: colors.textSecondary }}> (Organizer)</Text>
                      </Text>
                      <CopyButton text={host.name || host.email || "Host"} />
                    </View>
                  ))
                : booking.user && (
                    <View className="flex-row items-center py-2">
                      <Ionicons name="star" size={18} color="#FFD60A" />
                      <Text
                        className="ml-2.5 flex-1 text-[15px]"
                        style={{ color: colors.text }}
                        numberOfLines={1}
                      >
                        {booking.user.name || booking.user.email}
                        <Text style={{ color: colors.textSecondary }}> (Organizer)</Text>
                      </Text>
                      <CopyButton text={booking.user.name || booking.user.email} />
                    </View>
                  )}

              {/* Attendees */}
              {booking.attendees?.map((attendee, index) => {
                const statusIcon = getAttendeeStatusIcon(attendee);
                return (
                  <View
                    key={attendee.email}
                    className="flex-row items-center py-2"
                    style={
                      index > 0 || booking.hosts?.length || booking.user
                        ? { borderTopWidth: 1, borderTopColor: colors.border }
                        : {}
                    }
                  >
                    <Ionicons name={statusIcon.name} size={20} color={statusIcon.color} />
                    <Text
                      className="ml-2.5 flex-1 text-[15px]"
                      style={{ color: colors.text }}
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
              {booking.guests?.map((guestEmail, index) => (
                <View
                  key={guestEmail}
                  className="flex-row items-center py-2"
                  style={
                    index > 0 || booking.attendees?.length || booking.hosts?.length || booking.user
                      ? { borderTopWidth: 1, borderTopColor: colors.border }
                      : {}
                  }
                >
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                  <Text
                    className="ml-2.5 flex-1 text-[15px]"
                    style={{ color: colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {guestEmail}
                    <Text style={{ color: colors.textSecondary }}> (Guest)</Text>
                  </Text>
                  <CopyButton text={guestEmail} />
                </View>
              ))}
            </View>
          )}
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
              style={{ backgroundColor: colors.cardBackground }}
            >
              <View className="px-4 py-3.5">
                <Text
                  className="mb-2.5 text-[13px] font-medium uppercase tracking-wide"
                  style={{ color: colors.textSecondary }}
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
                      style={index > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : {}}
                    >
                      <Text className="mb-0.5 text-[13px]" style={{ color: colors.textSecondary }}>
                        {displayKey}
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[17px] flex-1" style={{ color: colors.text }}>
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

        {/* Description Card (if available) */}
        {booking.description && (
          <View
            className="mb-4 overflow-hidden rounded-xl"
            style={{ backgroundColor: colors.cardBackground }}
          >
            <View className="px-4 py-3.5">
              <Text
                className="mb-1.5 text-[13px] font-medium uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Notes
              </Text>
              <View className="flex-row items-start justify-between">
                <Text className="text-[17px] leading-6 flex-1 mr-2" style={{ color: colors.text }}>
                  {booking.description}
                </Text>
                <CopyButton text={booking.description} />
              </View>
            </View>
          </View>
        )}

        {/* Rescheduling Info Card (if applicable) */}
        {(booking.rescheduledFromUid ||
          booking.rescheduledToUid ||
          booking.reschedulingReason ||
          booking.fromReschedule) && (
          <View
            className="mb-4 overflow-hidden rounded-xl"
            style={{ backgroundColor: colors.cardBackground }}
          >
            <View className="px-4 py-3.5">
              <Text
                className="mb-2.5 text-[13px] font-medium uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Rescheduling Info
              </Text>

              {(booking.rescheduledFromUid || booking.fromReschedule) && (
                <AppPressable
                  className="flex-row items-center justify-between py-2"
                  onPress={() => {
                    const fromUid = booking.rescheduledFromUid || booking.fromReschedule;
                    if (fromUid) {
                      router.push({
                        pathname: "/(tabs)/(bookings)/booking-detail",
                        params: { uid: fromUid },
                      });
                    }
                  }}
                >
                  <Text className="text-[17px]" style={{ color: colors.text }}>
                    Rescheduled from
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="mr-1 text-[15px] text-[#007AFF]">View original</Text>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  </View>
                </AppPressable>
              )}

              {booking.rescheduledToUid && (
                <AppPressable
                  className="flex-row items-center justify-between py-2"
                  style={{ borderTopWidth: 1, borderTopColor: colors.border }}
                  onPress={() => {
                    const uid = booking.rescheduledToUid;
                    if (uid) {
                      router.push({
                        pathname: "/(tabs)/(bookings)/booking-detail",
                        params: { uid },
                      });
                    }
                  }}
                >
                  <Text className="text-[17px]" style={{ color: colors.text }}>
                    Rescheduled to
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="mr-1 text-[15px] text-[#007AFF]">View new</Text>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  </View>
                </AppPressable>
              )}

              {booking.reschedulingReason && (
                <View
                  className="py-2"
                  style={
                    booking.rescheduledFromUid || booking.rescheduledToUid || booking.fromReschedule
                      ? { borderTopWidth: 1, borderTopColor: colors.border }
                      : {}
                  }
                >
                  <Text className="mb-0.5 text-[13px]" style={{ color: colors.textSecondary }}>
                    Reason
                  </Text>
                  <View className="flex-row items-start justify-between">
                    <Text className="text-[17px] flex-1" style={{ color: colors.text }}>
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
              style={{ backgroundColor: colors.cardBackground }}
            >
              <View className="px-4 py-3.5">
                <Text className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-[#FF3B30]">
                  Cancellation Details
                </Text>

                {booking.cancellationReason && (
                  <View className="py-2">
                    <Text className="mb-0.5 text-[13px]" style={{ color: colors.textSecondary }}>
                      Reason
                    </Text>
                    <View className="flex-row items-start justify-between">
                      <Text className="text-[17px] flex-1" style={{ color: colors.text }}>
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
                        ? { borderTopWidth: 1, borderTopColor: colors.border }
                        : {}
                    }
                  >
                    <Text className="mb-0.5 text-[13px]" style={{ color: colors.textSecondary }}>
                      Cancelled by
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[17px] flex-1" style={{ color: colors.text }}>
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
                        ? { borderTopWidth: 1, borderTopColor: colors.border }
                        : {}
                    }
                  >
                    <Ionicons name="warning" size={18} color="#FF9500" />
                    <Text className="ml-2 text-[17px]" style={{ color: colors.text }}>
                      Host was absent
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
      </ScrollView>

      {/* Cancelling overlay */}
      {isCancelling && (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <View
            className="rounded-2xl px-8 py-6"
            style={{ backgroundColor: colors.cardBackground }}
          >
            <ActivityIndicator size="large" color={colors.text} />
            <Text className="mt-3 text-base font-medium" style={{ color: colors.textSecondary }}>
              Cancelling booking...
            </Text>
          </View>
        </View>
      )}
    </>
  );
}
