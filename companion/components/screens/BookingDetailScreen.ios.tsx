import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

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
  uid: string;
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
  uid,
  onActionsReady,
}: BookingDetailScreenProps): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [participantsExpanded, setParticipantsExpanded] = useState(true);

  const performCancelBooking = useCallback(
    async (reason: string) => {
      if (!booking) return;

      setIsCancelling(true);

      try {
        await CalComAPIService.cancelBooking(booking.uid, reason);
        Alert.alert("Success", "Booking cancelled successfully", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
        setIsCancelling(false);
      } catch (err) {
        console.error("Failed to cancel booking");
        if (__DEV__) {
          const message = err instanceof Error ? err.message : String(err);
          console.debug("[BookingDetailScreen.ios] cancelBooking failed", { message });
        }
        showErrorAlert("Error", "Failed to cancel booking. Please try again.");
        setIsCancelling(false);
      }
    },
    [booking, router]
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
      pathname: "/(tabs)/(bookings)/reschedule",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openEditLocationModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/(tabs)/(bookings)/edit-location",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openAddGuestsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/(tabs)/(bookings)/add-guests",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openMarkNoShowModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/(tabs)/(bookings)/mark-no-show",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openViewRecordingsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/(tabs)/(bookings)/view-recordings",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const openMeetingSessionDetailsModal = useCallback(() => {
    if (!booking) return;
    router.push({
      pathname: "/(tabs)/(bookings)/meeting-session-details",
      params: { uid: booking.uid },
    });
  }, [booking, router]);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
    let bookingData: Booking | null = null;
    let fetchError: Error | null = null;

    try {
      bookingData = await CalComAPIService.getBookingByUid(uid);
    } catch (err) {
      fetchError = err instanceof Error ? err : new Error(String(err));
    }

    if (bookingData) {
      if (__DEV__) {
        const hostCount = bookingData.hosts?.length ?? (bookingData.user ? 1 : 0);
        const attendeeCount = bookingData.attendees?.length ?? 0;
        console.debug("[BookingDetailScreen.ios] booking fetched", {
          uid: bookingData.uid,
          status: bookingData.status,
          hostCount,
          attendeeCount,
          hasRecurringEventId: Boolean(bookingData.recurringEventId),
        });
      }
      setBooking(bookingData);
      setLoading(false);
    } else {
      console.error("Error fetching booking");
      if (__DEV__ && fetchError) {
        console.debug("[BookingDetailScreen.ios] fetchBooking failed", {
          message: fetchError.message,
          stack: fetchError.stack,
        });
      }
      setError("Failed to load booking. Please try again.");
      if (__DEV__) {
        Alert.alert("Error", "Failed to load booking. Please try again.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        router.back();
      }
      setLoading(false);
    }
  }, [uid, router]);

  useEffect(() => {
    if (uid) {
      fetchBooking();
    } else {
      setLoading(false);
      setError("Invalid booking ID");
    }
  }, [uid, fetchBooking]);

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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f2f2f7]">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-gray-500">Loading booking...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f2f2f7] p-5">
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
          {error || "Booking not found"}
        </Text>
        <AppPressable className="mt-6 rounded-lg bg-black px-6 py-3" onPress={() => router.back()}>
          <Text className="text-base font-semibold text-white">Go Back</Text>
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
      return { name: "close-circle" as const, color: "#FF3B30", label: "No-show" };
    }

    if (normalizedStatus === "pending") {
      return { name: "help-circle" as const, color: "#8E8E93", label: "Pending" };
    }

    if (normalizedStatus === "cancelled" || normalizedStatus === "rejected") {
      return { name: "close-circle-outline" as const, color: "#8E8E93", label: null };
    }

    return { name: "checkmark-circle" as const, color: "#34C759", label: null };
  };

  return (
    <View className="flex-1 bg-[#f2f2f7]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section - iOS Calendar Style */}
        <View className="mb-8">
          {/* Meeting Title */}
          <Text
            className="mb-4 text-[26px] font-semibold leading-tight text-black"
            style={{ letterSpacing: -0.3 }}
          >
            {booking.title}
          </Text>

          {/* Event Type Slug and Duration Badge */}
          {(eventTypeSlug || durationFormatted) && (
            <View className="mb-3 flex-row items-center">
              {eventTypeSlug && <Text className="text-[15px] text-[#8E8E93]">{eventTypeSlug}</Text>}
              {eventTypeSlug && durationFormatted && (
                <Text className="mx-2 text-[15px] text-[#C7C7CC]">•</Text>
              )}
              {durationFormatted && (
                <View className="rounded-full bg-[#E5E5EA] px-2.5 py-1">
                  <Text className="text-[13px] font-medium text-[#636366]">
                    {durationFormatted}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Date */}
          <Text className="mb-0.5 text-[17px] text-black">{dateFormatted}</Text>

          {/* Time */}
          <Text className="mb-0.5 text-[17px] text-black">{timeFormatted}</Text>

          {/* Recurring indicator */}
          {isRecurring && <Text className="mt-0.5 text-[17px] text-[#800020]">Repeats weekly</Text>}
        </View>

        {/* Participants Card - iOS Calendar Style (Expandable) */}
        <View className="mb-4 overflow-hidden rounded-xl bg-white">
          <AppPressable
            className="flex-row items-center justify-between px-4 py-3.5"
            onPress={() => setParticipantsExpanded(!participantsExpanded)}
          >
            <Text className="text-[17px] text-black">Participants</Text>
            <View className="flex-row items-center">
              <Text className="mr-1 text-[17px] text-[#8E8E93]">{totalParticipants}</Text>
              <Ionicons
                name={participantsExpanded ? "chevron-down" : "chevron-forward"}
                size={18}
                color="#C7C7CC"
              />
            </View>
          </AppPressable>

          {/* Participants list - only show when expanded */}
          {participantsExpanded && (
            <View className="border-t border-[#E5E5EA] px-4 py-2.5">
              {/* Hosts */}
              {booking.hosts && booking.hosts.length > 0
                ? booking.hosts.map((host, index) => (
                    <View
                      key={host.email || `host-${index}`}
                      className={`flex-row items-center py-2 ${index > 0 ? "border-t border-[#E5E5EA]" : ""}`}
                    >
                      <Ionicons name="star" size={18} color="#FFD60A" />
                      <Text className="ml-2.5 flex-1 text-[15px] text-black" numberOfLines={1}>
                        {host.name || host.email || "Host"}
                      </Text>
                      <Text className="text-[13px] text-[#8E8E93]">Organizer</Text>
                    </View>
                  ))
                : booking.user && (
                    <View className="flex-row items-center py-2">
                      <Ionicons name="star" size={18} color="#FFD60A" />
                      <Text className="ml-2.5 flex-1 text-[15px] text-black" numberOfLines={1}>
                        {booking.user.name || booking.user.email}
                      </Text>
                      <Text className="text-[13px] text-[#8E8E93]">Organizer</Text>
                    </View>
                  )}

              {/* Attendees */}
              {booking.attendees?.map((attendee, index) => {
                const statusIcon = getAttendeeStatusIcon(attendee);
                return (
                  <View
                    key={attendee.email}
                    className={`flex-row items-center py-2 ${
                      index > 0 || booking.hosts?.length || booking.user
                        ? "border-t border-[#E5E5EA]"
                        : ""
                    }`}
                  >
                    <Ionicons name={statusIcon.name} size={20} color={statusIcon.color} />
                    <Text className="ml-2.5 flex-1 text-[15px] text-black" numberOfLines={1}>
                      {attendee.name || attendee.email}
                    </Text>
                    {statusIcon.label && (
                      <Text className="text-[13px]" style={{ color: statusIcon.color }}>
                        {statusIcon.label}
                      </Text>
                    )}
                  </View>
                );
              })}

              {/* Guests */}
              {booking.guests?.map((guestEmail, index) => (
                <View
                  key={guestEmail}
                  className={`flex-row items-center py-2 ${
                    index > 0 || booking.attendees?.length || booking.hosts?.length || booking.user
                      ? "border-t border-[#E5E5EA]"
                      : ""
                  }`}
                >
                  <Ionicons name="person-outline" size={20} color="#8E8E93" />
                  <Text className="ml-2.5 flex-1 text-[15px] text-[#8E8E93]" numberOfLines={1}>
                    {guestEmail}
                  </Text>
                  <Text className="text-[13px] text-[#8E8E93]">Guest</Text>
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
            <View className="mb-4 overflow-hidden rounded-xl bg-white">
              <View className="px-4 py-3.5">
                <Text className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-[#8E8E93]">
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
                      className={`py-2 ${index > 0 ? "border-t border-[#E5E5EA]" : ""}`}
                    >
                      <Text className="mb-0.5 text-[13px] text-[#8E8E93]">{displayKey}</Text>
                      <Text className="text-[17px] text-black">{displayValue}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Description Card (if available) */}
        {booking.description && (
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            <View className="px-4 py-3.5">
              <Text className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-[#8E8E93]">
                Notes
              </Text>
              <Text className="text-[17px] leading-6 text-black">{booking.description}</Text>
            </View>
          </View>
        )}

        {/* Rescheduling Info Card (if applicable) */}
        {(booking.rescheduledFromUid ||
          booking.rescheduledToUid ||
          booking.reschedulingReason ||
          booking.fromReschedule) && (
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            <View className="px-4 py-3.5">
              <Text className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-[#8E8E93]">
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
                  <Text className="text-[17px] text-black">Rescheduled from</Text>
                  <View className="flex-row items-center">
                    <Text className="mr-1 text-[15px] text-[#007AFF]">View original</Text>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  </View>
                </AppPressable>
              )}

              {booking.rescheduledToUid && (
                <AppPressable
                  className="flex-row items-center justify-between border-t border-[#E5E5EA] py-2"
                  onPress={() => {
                    router.push({
                      pathname: "/(tabs)/(bookings)/booking-detail",
                      params: { uid: booking.rescheduledToUid },
                    });
                  }}
                >
                  <Text className="text-[17px] text-black">Rescheduled to</Text>
                  <View className="flex-row items-center">
                    <Text className="mr-1 text-[15px] text-[#007AFF]">View new</Text>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  </View>
                </AppPressable>
              )}

              {booking.reschedulingReason && (
                <View
                  className={`py-2 ${booking.rescheduledFromUid || booking.rescheduledToUid || booking.fromReschedule ? "border-t border-[#E5E5EA]" : ""}`}
                >
                  <Text className="mb-0.5 text-[13px] text-[#8E8E93]">Reason</Text>
                  <Text className="text-[17px] text-black">{booking.reschedulingReason}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Cancellation Info Card (if cancelled) */}
        {normalizedStatus === "cancelled" &&
          (booking.cancellationReason || booking.cancelledByEmail || booking.absentHost) && (
            <View className="mb-4 overflow-hidden rounded-xl bg-white">
              <View className="px-4 py-3.5">
                <Text className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-[#FF3B30]">
                  Cancellation Details
                </Text>

                {booking.cancellationReason && (
                  <View className="py-2">
                    <Text className="mb-0.5 text-[13px] text-[#8E8E93]">Reason</Text>
                    <Text className="text-[17px] text-black">{booking.cancellationReason}</Text>
                  </View>
                )}

                {booking.cancelledByEmail && (
                  <View
                    className={`py-2 ${booking.cancellationReason ? "border-t border-[#E5E5EA]" : ""}`}
                  >
                    <Text className="mb-0.5 text-[13px] text-[#8E8E93]">Cancelled by</Text>
                    <Text className="text-[17px] text-black">{booking.cancelledByEmail}</Text>
                  </View>
                )}

                {booking.absentHost && (
                  <View
                    className={`flex-row items-center py-2 ${booking.cancellationReason || booking.cancelledByEmail ? "border-t border-[#E5E5EA]" : ""}`}
                  >
                    <Ionicons name="warning" size={18} color="#FF9500" />
                    <Text className="ml-2 text-[17px] text-black">Host was absent</Text>
                  </View>
                )}
              </View>
            </View>
          )}
      </ScrollView>

      {/* Cancelling overlay */}
      {isCancelling && (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <View className="rounded-2xl bg-white px-8 py-6">
            <ActivityIndicator size="large" color="#000" />
            <Text className="mt-3 text-base font-medium text-gray-700">Cancelling booking...</Text>
          </View>
        </View>
      )}
    </View>
  );
}
