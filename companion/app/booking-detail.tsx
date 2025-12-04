import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalComAPIService, Booking } from "../services/calcom";
import { SvgImage } from "../components/SvgImage";
import { FullScreenModal } from "../components/FullScreenModal";
import { getAppIconUrl } from "../utils/getAppIconUrl";
import { getDefaultLocationIconUrl, defaultLocations } from "../utils/defaultLocations";

// Format date: "Tuesday, November 25, 2025"
const formatDateFull = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    return "";
  }
};

// Format time: "9:40pm - 10:00pm"
const formatTime12Hour = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "pm" : "am";
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const minStr = minutes.toString().padStart(2, "0");
    return `${hour12}:${minStr}${period}`;
  } catch (error) {
    return "";
  }
};

// Get timezone from date string
const getTimezone = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone;
  } catch (error) {
    return "";
  }
};

// Get initials from a name (e.g., "Keith Williams" -> "KW", "Dhairyashil Shinde" -> "DS")
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
const getLocationProvider = (location: string | undefined, metadata?: Record<string, any>) => {
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
      // Format appId to display name (e.g., "cal-video" -> "Cal Video")
      const formatAppIdToDisplayName = (id: string): string => {
        return id
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };

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
    label: locationToCheck,
    iconUrl: null,
    url: null,
  };
};

export default function BookingDetail() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (uid) {
      fetchBooking();
    }
  }, [uid]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const bookingData = await CalComAPIService.getBookingByUid(uid);
      console.log("Booking data received:", JSON.stringify(bookingData, null, 2));
      console.log("User:", bookingData.user);
      console.log("Hosts:", bookingData.hosts);
      console.log("Attendees:", bookingData.attendees);
      console.log("Recurring fields:", {
        recurringEventId: bookingData.recurringEventId,
        recurringBookingUid: (bookingData as any).recurringBookingUid,
        metadata: (bookingData as any).metadata,
      });
      setBooking(bookingData);
    } catch (err) {
      console.error("Error fetching booking:", err);
      setError("Failed to load booking. Please try again.");
      Alert.alert("Error", "Failed to load booking. Please try again.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (!booking?.location) return;

    const provider = getLocationProvider(booking.location);
    if (provider?.url) {
      Linking.openURL(provider.url);
    }
  };

  const handleReschedule = async () => {
    if (!booking) return;

    setRescheduling(true);
    try {
      // For now, we'll use the current start time
      // In a full implementation, you'd show a date/time picker
      await CalComAPIService.rescheduleBooking(booking.uid, {
        start: booking.startTime,
        reschedulingReason: rescheduleReason.trim() || undefined,
      });

      Alert.alert("Success", "Reschedule request sent successfully");
      setShowRescheduleModal(false);
      setRescheduleReason("");

      // Refresh booking data
      await fetchBooking();
    } catch (error) {
      console.error("Failed to reschedule booking:", error);
      Alert.alert("Error", "Failed to send reschedule request. Please try again.");
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8f9fa]">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-gray-500">Loading booking...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8f9fa] p-5">
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
          {error || "Booking not found"}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-black px-6 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";
  const dateFormatted = formatDateFull(startTime);
  const timeFormatted = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
  const timezone = getTimezone(startTime);
  const locationProvider = getLocationProvider(booking.location, booking.responses);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: booking?.title || "Booking Details",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="items-center justify-center rounded-full"
              style={{ width: 40, height: 40, backgroundColor: "#F0F0F0" }}
            >
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowActionsModal(true)}
              className="items-center justify-center rounded-full"
              style={{ width: 40, height: 40, backgroundColor: "#F0F0F0" }}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1 bg-[#f8f9fa]">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
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
            {(booking.user || (booking.hosts && booking.hosts.length > 0)) && (
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
                      key={hostIndex}
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
            )}
            {booking.attendees && booking.attendees.length > 0 && (
              <View>
                {booking.attendees.map((attendee, index) => (
                  <View key={index} className={`flex-row items-start ${index > 0 ? "mt-4" : ""}`}>
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-black">
                      <Text className="text-base font-semibold text-white">
                        {getInitials(attendee.name)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-base font-medium text-[#333]">
                        {attendee.name}
                      </Text>
                      <Text className="text-sm text-[#666]">{attendee.email}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Where Section */}
          {locationProvider && (
            <View className="mb-2 rounded-2xl bg-white p-6">
              <Text className="mb-4 text-base font-medium text-[#666]">Where</Text>
              {locationProvider.url ? (
                <TouchableOpacity
                  onPress={handleJoinMeeting}
                  className="flex-row flex-wrap items-center"
                >
                  {locationProvider.iconUrl && (
                    <SvgImage
                      uri={locationProvider.iconUrl}
                      width={20}
                      height={20}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text className="text-base text-[#007AFF]">{locationProvider.label}: </Text>
                  <Text className="flex-1 text-base text-[#007AFF]" numberOfLines={1}>
                    {locationProvider.url}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center">
                  {locationProvider.iconUrl && (
                    <SvgImage
                      uri={locationProvider.iconUrl}
                      width={20}
                      height={20}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text className="text-base text-[#333]">{locationProvider.label}</Text>
                </View>
              )}
            </View>
          )}

          {/* Recurring Event Section */}
          {(booking.recurringEventId || booking.recurringBookingUid) && (
            <View className="mb-2 rounded-2xl bg-white p-6">
              <Text className="mb-2 text-base font-medium text-[#666]">Recurring Event</Text>
              <Text className="text-base text-[#666]">Every 2 weeks for 6 occurrences</Text>
            </View>
          )}

          {/* Description Section */}
          {booking.description && (
            <View className="mb-2 rounded-2xl bg-white p-6">
              <Text className="mb-2 text-base font-medium text-[#666]">Description</Text>
              <Text className="text-base leading-6 text-[#666]">{booking.description}</Text>
            </View>
          )}

          {/* Join Meeting Button */}
          {locationProvider?.url && (
            <TouchableOpacity
              onPress={handleJoinMeeting}
              className="mb-2 flex-row items-center justify-center rounded-lg bg-black px-6 py-4"
            >
              {locationProvider.iconUrl && (
                <SvgImage
                  uri={locationProvider.iconUrl}
                  width={20}
                  height={20}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text className="text-base font-semibold text-white">
                Join {locationProvider.label}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Booking Actions Modal */}
      <FullScreenModal
        visible={showActionsModal}
        animationType="fade"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowActionsModal(false)}
        >
          <TouchableOpacity
            className="mx-4 w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="border-b border-gray-200 p-6">
              <Text className="text-center text-xl font-semibold text-gray-900">
                Booking Actions
              </Text>
            </View>
            {/* Actions List */}
            <View className="p-2">
              {/* View Booking */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  // TODO: Navigate to booking view page
                  console.log("View booking");
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="eye-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">View Booking</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Edit event label */}
              <View className="px-4 py-1">
                <Text className="text-xs font-medium text-gray-500">Edit event</Text>
              </View>

              {/* Request Reschedule */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  setShowRescheduleModal(true);
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="send-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Send Reschedule Request</Text>
              </TouchableOpacity>

              {/* Edit Location */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  // TODO: Open edit location dialog
                  console.log("Edit location");
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Edit Location</Text>
              </TouchableOpacity>

              {/* Add Guests */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  // TODO: Open add guests dialog
                  console.log("Add guests");
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="person-add-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Add Guests</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* After event label */}
              <View className="px-4 py-1">
                <Text className="text-xs font-medium text-gray-500">After event</Text>
              </View>

              {/* View Recordings */}
              {locationProvider?.url && (
                <TouchableOpacity
                  onPress={() => {
                    setShowActionsModal(false);
                    // TODO: Open view recordings dialog
                    console.log("View recordings");
                  }}
                  className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                >
                  <Ionicons name="videocam-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">View Recordings</Text>
                </TouchableOpacity>
              )}

              {/* Meeting Session Details */}
              {locationProvider?.url && (
                <TouchableOpacity
                  onPress={() => {
                    setShowActionsModal(false);
                    // TODO: Open session details dialog
                    console.log("Meeting session details");
                  }}
                  className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                >
                  <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Meeting Session Details</Text>
                </TouchableOpacity>
              )}

              {/* Mark as No-Show */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  // TODO: Mark as no-show
                  console.log("Mark as no-show");
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="eye-off-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Mark as No-Show</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Report Booking */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  // TODO: Open report booking dialog
                  console.log("Report booking");
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="flag-outline" size={20} color="#EF4444" />
                <Text className="ml-3 text-base text-red-500">Report Booking</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Cancel Booking */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes, Cancel",
                      style: "destructive",
                      onPress: () => {
                        // TODO: Cancel booking
                        console.log("Cancel booking");
                      },
                    },
                  ]);
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text className="ml-3 text-base text-red-500">Cancel Booking</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel button */}
            <View className="border-t border-gray-200 p-2 md:p-4">
              <TouchableOpacity
                className="w-full rounded-lg bg-gray-100 p-3"
                onPress={() => setShowActionsModal(false)}
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Reschedule Modal */}
      <FullScreenModal
        visible={showRescheduleModal}
        animationType="fade"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowRescheduleModal(false)}
        >
          <TouchableOpacity
            className="w-[90%] max-w-[500px] rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.25,
              shadowRadius: 25,
              elevation: 24,
            }}
          >
            {/* Header */}
            <View className="px-8 pb-4 pt-6">
              <View className="flex-row items-start space-x-3">
                <View className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F3F4F6]">
                  <Ionicons name="time-outline" size={24} color="#111827" />
                </View>
                <View className="flex-1 pt-1">
                  <Text className="mb-2 text-2xl font-semibold text-[#111827]">
                    Reschedule request
                  </Text>
                  <Text className="text-sm text-[#6B7280]">
                    Send a reschedule request to the organizer of this booking.
                  </Text>
                </View>
              </View>
            </View>

            {/* Content */}
            <View className="px-8 pb-6">
              <Text className="mb-2 text-sm font-bold text-[#111827]">
                Reason for reschedule request
                <Text className="font-normal text-[#6B7280]"> (Optional)</Text>
              </Text>
              <TextInput
                className="min-h-[100px] rounded-md border border-[#D1D5DB] bg-white px-3 py-3 text-base text-[#111827]"
                placeholder="Please let us know why you need to reschedule..."
                placeholderTextColor="#9CA3AF"
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!rescheduling}
              />
            </View>

            {/* Footer */}
            <View className="rounded-b-2xl border-t border-[#E5E7EB] bg-[#F9FAFB] px-8 py-4">
              <View className="flex-row justify-end gap-2 space-x-2">
                <TouchableOpacity
                  className="rounded-xl border border-[#D1D5DB] bg-white px-2 py-2 md:px-4"
                  onPress={() => {
                    setShowRescheduleModal(false);
                    setRescheduleReason("");
                  }}
                  disabled={rescheduling}
                >
                  <Text className="text-base font-medium text-[#374151]">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`rounded-xl bg-[#111827] px-2 py-2 md:px-4 ${rescheduling ? "opacity-60" : ""}`}
                  onPress={handleReschedule}
                  disabled={rescheduling}
                >
                  <Text className="text-base font-medium text-white">Reschedule request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>
    </>
  );
}
