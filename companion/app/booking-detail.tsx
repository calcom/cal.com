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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalComAPIService, Booking } from "../services/calcom";
import { SvgImage } from "../components/SvgImage";
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
      { pattern: /meet\.google\.com/, label: "Google Meet", type: "google_video", appId: "google-meet" },
      { pattern: /teams\.microsoft\.com/, label: "Microsoft Teams", type: "office365_video", appId: "msteams" },
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
        <Text className="mt-4 mb-2 text-center text-xl font-bold text-gray-800">
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
          headerTitle: "Booking Details",
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
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          {/* Title */}
          <View className="mb-3">
            <Text className="text-2xl font-semibold text-[#333] mb-2">{booking.title}</Text>
            <Text className="text-base text-[#666]">
              {dateFormatted} {timeFormatted} ({timezone})
            </Text>
          </View>

          {/* Who Section */}
          <View className="bg-white rounded-2xl p-6 mb-2">
            <Text className="text-base font-medium text-[#666] mb-4">Who</Text>
            {/* Show host from user field or hosts array */}
            {(booking.user || (booking.hosts && booking.hosts.length > 0)) && (
              <View className="mb-4">
                {booking.user ? (
                  <View className="flex-row items-start">
                    <View className="w-12 h-12 rounded-full bg-black items-center justify-center mr-3">
                      <Text className="text-base font-semibold text-white">{getInitials(booking.user.name)}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1 flex-wrap">
                        <Text className="text-base font-medium text-[#333]">{booking.user.name}</Text>
                        <View className="bg-[#007AFF] px-2 py-0.5 rounded ml-2">
                          <Text className="text-xs font-medium text-white">host</Text>
                        </View>
                      </View>
                      <Text className="text-sm text-[#666]">{booking.user.email}</Text>
                    </View>
                  </View>
                ) : booking.hosts && booking.hosts.length > 0 ? (
                  booking.hosts.map((host, hostIndex) => (
                    <View key={hostIndex} className={`flex-row items-start ${hostIndex > 0 ? "mt-4" : ""}`}>
                      <View className="w-12 h-12 rounded-full bg-black items-center justify-center mr-3">
                        <Text className="text-base font-semibold text-white">{getInitials(host.name || "Host")}</Text>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1 flex-wrap">
                          <Text className="text-base font-medium text-[#333]">{host.name || "Host"}</Text>
                          <View className="bg-[#007AFF] px-2 py-0.5 rounded ml-2">
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
                    <View className="w-12 h-12 rounded-full bg-black items-center justify-center mr-3">
                      <Text className="text-base font-semibold text-white">{getInitials(attendee.name)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-[#333] mb-1">{attendee.name}</Text>
                      <Text className="text-sm text-[#666]">{attendee.email}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Where Section */}
          {locationProvider && (
            <View className="bg-white rounded-2xl p-6 mb-2">
              <Text className="text-base font-medium text-[#666] mb-4">Where</Text>
              {locationProvider.url ? (
                <TouchableOpacity
                  onPress={handleJoinMeeting}
                  className="flex-row items-center flex-wrap"
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
                  <Text className="text-base text-[#007AFF] flex-1" numberOfLines={1}>
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
            <View className="bg-white rounded-2xl p-6 mb-2">
              <Text className="text-base font-medium text-[#666] mb-2">Recurring Event</Text>
              <Text className="text-base text-[#666]">
                Every 2 weeks for 6 occurrences
              </Text>
            </View>
          )}

          {/* Description Section */}
          {booking.description && (
            <View className="bg-white rounded-2xl p-6 mb-2">
              <Text className="text-base font-medium text-[#666] mb-2">Description</Text>
              <Text className="text-base text-[#666] leading-6">{booking.description}</Text>
            </View>
          )}

          {/* Join Meeting Button */}
          {locationProvider?.url && (
            <TouchableOpacity
              onPress={handleJoinMeeting}
              className="bg-black rounded-lg py-4 px-6 mb-2 flex-row items-center justify-center"
            >
              {locationProvider.iconUrl && (
                <SvgImage
                  uri={locationProvider.iconUrl}
                  width={20}
                  height={20}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text className="text-white text-base font-semibold">
                Join {locationProvider.label}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Booking Actions Modal */}
      <Modal visible={showActionsModal} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowActionsModal(false)}>
          <TouchableOpacity
            className="bg-white rounded-2xl w-full max-w-sm mx-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <View className="p-6 border-b border-gray-200">
              <Text className="text-xl font-semibold text-gray-900 text-center">
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
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
              >
                <Ionicons name="eye-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">View Booking</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="h-px bg-gray-200 mx-4 my-2" />
              
              {/* Edit event label */}
              <View className="px-4 py-1">
                <Text className="text-xs text-gray-500 font-medium">Edit event</Text>
              </View>

              {/* Request Reschedule */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  setShowRescheduleModal(true);
                }}
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
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
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
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
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
              >
                <Ionicons name="person-add-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Add Guests</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="h-px bg-gray-200 mx-4 my-2" />
              
              {/* After event label */}
              <View className="px-4 py-1">
                <Text className="text-xs text-gray-500 font-medium">After event</Text>
              </View>

              {/* View Recordings */}
              {locationProvider?.url && (
                <TouchableOpacity
                  onPress={() => {
                    setShowActionsModal(false);
                    // TODO: Open view recordings dialog
                    console.log("View recordings");
                  }}
                  className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
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
                  className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
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
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
              >
                <Ionicons name="eye-off-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Mark as No-Show</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="h-px bg-gray-200 mx-4 my-2" />

              {/* Report Booking */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  // TODO: Open report booking dialog
                  console.log("Report booking");
                }}
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
              >
                <Ionicons name="flag-outline" size={20} color="#EF4444" />
                <Text className="ml-3 text-base text-red-500">Report Booking</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="h-px bg-gray-200 mx-4 my-2" />

              {/* Cancel Booking */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  Alert.alert(
                    "Cancel Booking",
                    "Are you sure you want to cancel this booking?",
                    [
                      { text: "No", style: "cancel" },
                      {
                        text: "Yes, Cancel",
                        style: "destructive",
                        onPress: () => {
                          // TODO: Cancel booking
                          console.log("Cancel booking");
                        },
                      },
                    ]
                  );
                }}
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
              >
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text className="ml-3 text-base text-red-500">Cancel Booking</Text>
              </TouchableOpacity>
            </View>
            
            {/* Cancel button */}
            <View className="p-2 md:p-4 border-t border-gray-200">
              <TouchableOpacity
                className="w-full p-3 bg-gray-100 rounded-lg"
                onPress={() => setShowActionsModal(false)}>
                <Text className="text-center text-base font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRescheduleModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View
            className="bg-white rounded-2xl w-[90%] max-w-[500px]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.25,
              shadowRadius: 25,
              elevation: 24,
            }}>
            {/* Header */}
            <View className="px-8 pt-6 pb-4">
              <View className="flex-row items-start space-x-3">
                <View className="bg-[#F3F4F6] rounded-full w-10 h-10 items-center justify-center flex-shrink-0">
                  <Ionicons name="time-outline" size={24} color="#111827" />
                </View>
                <View className="flex-1 pt-1">
                  <Text className="text-2xl font-semibold text-[#111827] mb-2">
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
              <Text className="text-sm font-bold text-[#111827] mb-2">
                Reason for reschedule request
                <Text className="text-[#6B7280] font-normal"> (Optional)</Text>
              </Text>
              <TextInput
                className="bg-white rounded-md px-3 py-3 text-base text-[#111827] border border-[#D1D5DB] min-h-[100px]"
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
            <View className="bg-[#F9FAFB] border-t border-[#E5E7EB] rounded-b-2xl px-8 py-4">
              <View className="flex-row justify-end space-x-2 gap-2">
                <TouchableOpacity
                  className="px-2 md:px-4 py-2 rounded-xl bg-white border border-[#D1D5DB]"
                  onPress={() => {
                    setShowRescheduleModal(false);
                    setRescheduleReason("");
                  }}
                  disabled={rescheduling}>
                  <Text className="text-base font-medium text-[#374151]">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-2 md:px-4 py-2 bg-[#111827] rounded-xl ${rescheduling ? "opacity-60" : ""}`}
                  onPress={handleReschedule}
                  disabled={rescheduling}>
                  <Text className="text-base font-medium text-white">
                    Reschedule request
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

