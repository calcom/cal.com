import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Linking,
  Alert,
  Clipboard,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalComAPIService, Schedule, ConferencingOption, EventType } from "../services/calcom";
import { getAppIconUrl } from "../utils/getAppIconUrl";
import { SvgImage } from "../components/SvgImage";

const tabs = [
  { id: "basics", label: "Basics", icon: "link" },
  { id: "availability", label: "Availability", icon: "calendar" },
  { id: "limits", label: "Limits", icon: "time" },
  { id: "advanced", label: "Advanced", icon: "settings" },
  { id: "recurring", label: "Recurring", icon: "refresh" },
  { id: "apps", label: "Apps", icon: "grid" },
  { id: "workflows", label: "Workflows", icon: "flash" },
  { id: "webhooks", label: "Webhooks", icon: "code" },
];

export default function EventTypeDetail() {
  const router = useRouter();
  const { id, title, description, duration, price, currency, slug } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    price?: string;
    currency?: string;
    slug?: string;
  }>();

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("basics");

  // Form state
  const [eventTitle, setEventTitle] = useState(title || "");
  const [eventDescription, setEventDescription] = useState(description || "");
  const [eventSlug, setEventSlug] = useState(slug || "");
  const [eventDuration, setEventDuration] = useState(duration || "30");
  const [username, setUsername] = useState("username");
  const [allowMultipleDurations, setAllowMultipleDurations] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [defaultDuration, setDefaultDuration] = useState("");
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showDefaultDurationDropdown, setShowDefaultDurationDropdown] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedScheduleDetails, setSelectedScheduleDetails] = useState<Schedule | null>(null);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleDetailsLoading, setScheduleDetailsLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [conferencingOptions, setConferencingOptions] = useState<ConferencingOption[]>([]);
  const [conferencingLoading, setConferencingLoading] = useState(false);
  const [eventTypeData, setEventTypeData] = useState<EventType | null>(null);
  const [saving, setSaving] = useState(false);
  const [beforeEventBuffer, setBeforeEventBuffer] = useState("No buffer time");
  const [afterEventBuffer, setAfterEventBuffer] = useState("No buffer time");
  const [showBeforeBufferDropdown, setShowBeforeBufferDropdown] = useState(false);
  const [showAfterBufferDropdown, setShowAfterBufferDropdown] = useState(false);
  const [minimumNoticeValue, setMinimumNoticeValue] = useState("1");
  const [minimumNoticeUnit, setMinimumNoticeUnit] = useState("Hours");
  const [showMinimumNoticeUnitDropdown, setShowMinimumNoticeUnitDropdown] = useState(false);
  const [limitBookingFrequency, setLimitBookingFrequency] = useState(false);
  const [frequencyLimits, setFrequencyLimits] = useState([{ id: 1, value: "1", unit: "Per day" }]);
  const [showFrequencyUnitDropdown, setShowFrequencyUnitDropdown] = useState<number | null>(null);
  const [frequencyAnimationValue] = useState(new Animated.Value(0));
  const [limitTotalDuration, setLimitTotalDuration] = useState(false);
  const [durationLimits, setDurationLimits] = useState([{ id: 1, value: "60", unit: "Per day" }]);
  const [showDurationUnitDropdown, setShowDurationUnitDropdown] = useState<number | null>(null);
  const [durationAnimationValue] = useState(new Animated.Value(0));
  const bufferTimeOptions = [
    "No buffer time",
    "5 Minutes",
    "10 Minutes",
    "15 Minutes",
    "20 Minutes",
    "30 Minutes",
    "45 Minutes",
    "60 Minutes",
    "90 Minutes",
    "120 Minutes",
  ];
  const timeUnitOptions = ["Minutes", "Hours", "Days"];
  const frequencyUnitOptions = ["Per day", "Per Month", "Per year"];
  const durationUnitOptions = ["Per day", "Per week", "Per month"];
  const availableDurations = [
    "5 mins",
    "10 mins",
    "15 mins",
    "20 mins",
    "25 mins",
    "30 mins",
    "45 mins",
    "50 mins",
    "60 mins",
    "75 mins",
    "80 mins",
    "90 mins",
    "120 mins",
    "150 mins",
    "180 mins",
    "240 mins",
    "300 mins",
    "360 mins",
    "420 mins",
    "480 mins",
  ];

  const formatDuration = (minutes: string) => {
    const mins = parseInt(minutes) || 0;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const truncateTitle = (text: string, maxLength: number = 20) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const formatAppIdToDisplayName = (appId: string): string => {
    // Convert appId like "google-meet" to "Google Meet"
    return appId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const displayNameToAppId = (displayName: string): string | null => {
    // Convert display name like "Google Meet" back to "google-meet"
    // Find matching conferencing option
    const option = conferencingOptions.find((opt) => formatAppIdToDisplayName(opt.appId) === displayName);
    return option ? option.appId : null;
  };

  const getLocationOptions = (): Array<{ label: string; iconUrl: string | null }> => {
    const options = conferencingOptions.map((option) => {
      const iconUrl = getAppIconUrl(option.type, option.appId);
      console.log('Location option:', {
        appId: option.appId,
        type: option.type,
        iconUrl: iconUrl,
        label: formatAppIdToDisplayName(option.appId)
      });
      return {
        label: formatAppIdToDisplayName(option.appId),
        iconUrl: iconUrl,
      };
    });
    return options;
  };

  const getSelectedLocationIconUrl = (): string | null => {
    if (!selectedLocation) return null;
    const option = conferencingOptions.find((opt) => formatAppIdToDisplayName(opt.appId) === selectedLocation);
    if (option) {
      return getAppIconUrl(option.type, option.appId);
    }
    return null;
  };

  const toggleDurationSelection = (duration: string) => {
    const newSelected = selectedDurations.includes(duration)
      ? selectedDurations.filter((d) => d !== duration)
      : [...selectedDurations, duration];

    setSelectedDurations(newSelected);

    // Reset default duration if it's no longer in selected durations
    if (!newSelected.includes(defaultDuration)) {
      setDefaultDuration("");
    }
  };

  const toggleBookingFrequency = (value: boolean) => {
    setLimitBookingFrequency(value);

    Animated.timing(frequencyAnimationValue, {
      toValue: value ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const addFrequencyLimit = () => {
    const newId = Math.max(...frequencyLimits.map((limit) => limit.id)) + 1;
    setFrequencyLimits([...frequencyLimits, { id: newId, value: "1", unit: "Per day" }]);
  };

  const removeFrequencyLimit = (id: number) => {
    setFrequencyLimits(frequencyLimits.filter((limit) => limit.id !== id));
  };

  const updateFrequencyLimit = (id: number, field: "value" | "unit", newValue: string) => {
    setFrequencyLimits(
      frequencyLimits.map((limit) => (limit.id === id ? { ...limit, [field]: newValue } : limit))
    );
  };

  const toggleTotalDuration = (value: boolean) => {
    setLimitTotalDuration(value);

    Animated.timing(durationAnimationValue, {
      toValue: value ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const addDurationLimit = () => {
    const newId = Math.max(...durationLimits.map((limit) => limit.id)) + 1;
    setDurationLimits([...durationLimits, { id: newId, value: "60", unit: "Per day" }]);
  };

  const removeDurationLimit = (id: number) => {
    setDurationLimits(durationLimits.filter((limit) => limit.id !== id));
  };

  const updateDurationLimit = (id: number, field: "value" | "unit", newValue: string) => {
    setDurationLimits(
      durationLimits.map((limit) => (limit.id === id ? { ...limit, [field]: newValue } : limit))
    );
  };

  const fetchSchedules = async () => {
    try {
      setSchedulesLoading(true);
      const schedulesData = await CalComAPIService.getSchedules();
      setSchedules(schedulesData);

      // Set default schedule if one exists
      const defaultSchedule = schedulesData.find((schedule) => schedule.isDefault);
      if (defaultSchedule) {
        setSelectedSchedule(defaultSchedule);
        await fetchScheduleDetails(defaultSchedule.id);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const fetchScheduleDetails = async (scheduleId: number) => {
    try {
      setScheduleDetailsLoading(true);
      console.log("Fetching schedule details for ID:", scheduleId);
      const scheduleDetails = await CalComAPIService.getScheduleById(scheduleId);
      console.log("Raw schedule details response:", scheduleDetails);
      setSelectedScheduleDetails(scheduleDetails);
    } catch (error) {
      console.error("Failed to fetch schedule details:", error);
      setSelectedScheduleDetails(null);
    } finally {
      setScheduleDetailsLoading(false);
    }
  };

  const fetchConferencingOptions = async () => {
    try {
      setConferencingLoading(true);
      const options = await CalComAPIService.getConferencingOptions();
      console.log("Fetched conferencing options:", JSON.stringify(options, null, 2));
      setConferencingOptions(options);
    } catch (error) {
      console.error("Failed to fetch conferencing options:", error);
    } finally {
      setConferencingLoading(false);
    }
  };

  const fetchEventTypeData = async () => {
    if (!id) return;

    try {
      const eventType = await CalComAPIService.getEventTypeById(parseInt(id));
      if (eventType) {
        setEventTypeData(eventType);

        // Extract location from event type
        if (eventType.locations && eventType.locations.length > 0) {
          const firstLocation = eventType.locations[0];
          if (firstLocation.integration) {
            // Format the integration name (e.g., "google-meet" -> "Google Meet")
            const formattedLocation = formatAppIdToDisplayName(firstLocation.integration);
            setSelectedLocation(formattedLocation);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch event type data:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "availability") {
      fetchSchedules();
    }
    if (activeTab === "basics") {
      fetchConferencingOptions();
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch event type data and conferencing options on initial load
    fetchEventTypeData();
    fetchConferencingOptions();
  }, [id]);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const userUsername = await CalComAPIService.getUsername();
        setUsername(userUsername);
      } catch (error) {
        console.error("Failed to fetch username:", error);
      }
    };
    fetchUsername();
  }, []);

  const formatTime = (time: string) => {
    try {
      // Handle different time formats that might come from the API
      let date: Date;

      if (time.includes(":")) {
        // Format like "09:00" or "09:00:00"
        const [hours, minutes] = time.split(":").map(Number);
        date = new Date();
        date.setHours(hours, minutes || 0, 0, 0);
      } else {
        // Other formats
        date = new Date(time);
      }

      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return time; // Return original if parsing fails
    }
  };

  const getDaySchedule = () => {
    if (!selectedScheduleDetails) {
      console.log("No selectedScheduleDetails");
      return [];
    }

    console.log("selectedScheduleDetails:", selectedScheduleDetails);
    console.log("availability:", selectedScheduleDetails.availability);

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const daySchedule = daysOfWeek.map((day) => {
      // Try different possible day formats
      const dayLower = day.toLowerCase();
      const dayUpper = day.toUpperCase();
      const dayShort = day.substring(0, 3).toLowerCase(); // mon, tue, etc.
      const dayShortUpper = day.substring(0, 3).toUpperCase();

      const availability = selectedScheduleDetails.availability?.find((avail) => {
        if (!avail.days || !Array.isArray(avail.days)) return false;

        return avail.days.some(
          (d) =>
            d === dayLower ||
            d === dayUpper ||
            d === day ||
            d === dayShort ||
            d === dayShortUpper ||
            d.toLowerCase() === dayLower
        );
      });

      console.log(`${day}: availability found:`, availability);

      return {
        day,
        available: !!availability,
        startTime: availability?.startTime,
        endTime: availability?.endTime,
      };
    });

    return daySchedule;
  };

  const handlePreview = async () => {
    try {
      const eventTypeSlug = eventSlug || "preview";
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);

      const supported = await Linking.canOpenURL(link);
      if (supported) {
        await Linking.openURL(link);
      } else {
        Alert.alert("Error", "Cannot open this URL on your device.");
      }
    } catch (error) {
      console.error("Failed to generate preview link:", error);
      Alert.alert("Error", "Failed to generate preview link. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    try {
      const eventTypeSlug = eventSlug || "event-link";
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);

      Clipboard.setString(link);
      Alert.alert("Success", "Link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      Alert.alert("Error", "Failed to copy link. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Event Type", `Are you sure you want to delete "${eventTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("Attempting to delete event type with ID:", id);
            const eventTypeId = parseInt(id);

            if (isNaN(eventTypeId)) {
              throw new Error("Invalid event type ID");
            }

            await CalComAPIService.deleteEventType(eventTypeId);
            console.log("Event type deleted successfully");

            Alert.alert("Success", "Event type deleted successfully", [
              {
                text: "OK",
                onPress: () => {
                  console.log("Navigating back after successful deletion");
                  router.back();
                },
              },
            ]);
          } catch (error) {
            console.error("Failed to delete event type:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            Alert.alert("Error", `Failed to delete event type: ${errorMessage}`);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!id) {
      Alert.alert("Error", "Event type ID is missing");
      return;
    }

    try {
      setSaving(true);

      // Prepare location update if a location is selected
      const updates: {
        locations?: Array<{
          type: string;
          integration: string;
          public: boolean;
        }>;
      } = {};

      if (selectedLocation) {
        const integrationId = displayNameToAppId(selectedLocation);
        if (!integrationId) {
          Alert.alert("Error", "Invalid location selected");
          setSaving(false);
          return;
        }

        // The API accepts: cal-video, google-meet, zoom
        // Use the appId directly from conferencing options
        updates.locations = [
          {
            type: "integration",
            integration: integrationId,
            public: true,
          },
        ];
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await CalComAPIService.updateEventType(parseInt(id), updates);
        Alert.alert("Success", "Event type updated successfully");

        // Refresh event type data
        await fetchEventTypeData();
      } else {
        Alert.alert("Info", "No changes to save");
      }
    } catch (error) {
      console.error("Failed to update event type:", error);
      Alert.alert("Error", "Failed to update event type. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-[#f8f9fa]">
        {/* Glass Header */}
        <GlassView
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              paddingHorizontal: 20,
              paddingBottom: 12,
              paddingTop: insets.top + 8,
            },
          ]}
          glassEffectStyle="clear">
          <View className="flex-row items-center justify-between min-h-[44px]">
            <TouchableOpacity className="w-10 h-10 justify-center items-start" onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>

            <Text className="flex-1 text-lg font-semibold text-black text-center mx-2.5" numberOfLines={1}>
              {truncateTitle(title)}
            </Text>

            <TouchableOpacity
              className={`px-4 py-2 bg-black rounded-[10px] min-w-[60px] items-center ${saving ? "opacity-60" : ""}`}
              onPress={handleSave}
              disabled={saving}>
              <Text className="text-white text-base font-semibold">{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </GlassView>

        {/* Tabs */}
        <View
          className="absolute top-0 left-0 right-0 z-[999] bg-white border-b border-[#C6C6C8] pb-2"
          style={{ paddingTop: insets.top + 70 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                className={`px-4 py-2 rounded-[20px] min-w-[80px] items-center ${
                  activeTab === tab.id ? "bg-[#EEEFF2]" : ""
                }`}
                onPress={() => setActiveTab(tab.id)}>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? "#000" : "#666"} />
                  <Text
                    className={`text-sm font-medium ${activeTab === tab.id ? "text-black font-semibold" : "text-[#666]"}`}>
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1, paddingTop: 180, paddingBottom: 250 }} contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
          {activeTab === "basics" && (
            <View className="gap-4">
              {/* Title and Description Card */}
              <View className="bg-white rounded-2xl p-6">
                <View className="mb-5">
                  <Text className="text-base font-semibold text-[#333] mb-2">Title</Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    placeholder="Enter event title"
                    placeholderTextColor="#8E8E93"
                  />
                </View>

                <View className="mb-5">
                  <Text className="text-base font-semibold text-[#333] mb-2">Description</Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                    style={{ height: 100, textAlignVertical: "top" }}
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    placeholder="Enter event description"
                    placeholderTextColor="#8E8E93"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View className="mb-5">
                  <Text className="text-base font-semibold text-[#333] mb-2">URL</Text>
                  <View className="flex-row items-center bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg overflow-hidden">
                    <Text className="bg-[#E5E5EA] text-[#666] text-base px-3 py-3 rounded-tl-lg rounded-bl-lg">cal.com/{username}/</Text>
                    <TextInput
                      className="flex-1 px-3 py-3 text-base text-black"
                      value={eventSlug}
                      onChangeText={setEventSlug}
                      placeholder="event-slug"
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                </View>
              </View>

              {/* Duration Card */}
              <View className="bg-white rounded-2xl p-6">
                {!allowMultipleDurations && (
                  <View className="mb-5">
                    <Text className="text-base font-semibold text-[#333] mb-2">Duration</Text>
                    <View className="flex-row items-center gap-3">
                      <TextInput
                        className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                        value={eventDuration}
                        onChangeText={setEventDuration}
                        placeholder="30"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                      />
                      <Text className="text-base text-[#666]">Minutes</Text>
                    </View>
                  </View>
                )}

                {allowMultipleDurations && (
                  <>
                    <View className="mb-5">
                      <Text className="text-base font-semibold text-[#333] mb-2">Available durations</Text>
                      <TouchableOpacity
                        className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                        onPress={() => setShowDurationDropdown(true)}>
                        <Text className="text-base text-black">
                          {selectedDurations.length > 0
                            ? `${selectedDurations.length} duration${
                                selectedDurations.length > 1 ? "s" : ""
                              } selected`
                            : "Select durations"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>

                    {selectedDurations.length > 0 && (
                      <View className="mb-5">
                        <Text className="text-base font-semibold text-[#333] mb-2">Default duration</Text>
                        <TouchableOpacity
                          className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                          onPress={() => setShowDefaultDurationDropdown(true)}>
                          <Text className="text-base text-black">
                            {defaultDuration || "Select default duration"}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                <View className="flex-row justify-between items-start">
                  <Text className="text-base text-[#333] font-medium mb-1">Allow multiple durations</Text>
                  <Switch
                    value={allowMultipleDurations}
                    onValueChange={setAllowMultipleDurations}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Location Card */}
              <View className="bg-white rounded-2xl p-6">
                <View className="mb-5">
                  <Text className="text-base font-semibold text-[#333] mb-2">Location</Text>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                    onPress={() => setShowLocationDropdown(true)}
                    disabled={conferencingLoading}>
                    <View className="flex-row items-center flex-1">
                      {!conferencingLoading && selectedLocation && getSelectedLocationIconUrl() && (
                        <SvgImage
                          uri={getSelectedLocationIconUrl()!}
                          width={20}
                          height={20}
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <Text className="text-base text-black">
                        {conferencingLoading ? "Loading locations..." : selectedLocation || "Select location"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Duration Multi-Select Modal */}
          <Modal
            visible={showDurationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDurationDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowDurationDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[300px] max-w-[90%] max-h-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Available Durations</Text>
                <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
                  {availableDurations.map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        selectedDurations.includes(duration) ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => toggleDurationSelection(duration)}>
                      <Text className={`text-base text-[#333] ${selectedDurations.includes(duration) ? "font-semibold" : ""}`}>
                        {duration}
                      </Text>
                      {selectedDurations.includes(duration) && (
                        <Ionicons name="checkmark" size={20} color="#000" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity className="bg-black py-3 px-6 rounded-lg items-center" onPress={() => setShowDurationDropdown(false)}>
                  <Text className="text-white text-base font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Default Duration Dropdown Modal */}
          <Modal
            visible={showDefaultDurationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDefaultDurationDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowDefaultDurationDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Default Duration</Text>
                {selectedDurations.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      defaultDuration === duration ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setDefaultDuration(duration);
                      setShowDefaultDurationDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${defaultDuration === duration ? "font-semibold" : ""}`}>
                      {duration}
                    </Text>
                    {defaultDuration === duration && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Schedule Dropdown Modal */}
          <Modal
            visible={showScheduleDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowScheduleDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowScheduleDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Schedule</Text>
                {schedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.id}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      selectedSchedule?.id === schedule.id ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setSelectedSchedule(schedule);
                      setShowScheduleDropdown(false);
                      fetchScheduleDetails(schedule.id);
                    }}>
                    <View className="flex-1 flex-row items-center justify-between">
                      <Text className={`text-base text-[#333] ${selectedSchedule?.id === schedule.id ? "font-semibold" : ""}`}>
                        {schedule.name}
                      </Text>
                      {schedule.isDefault && (
                        <Text className="text-xs text-[#34C759] font-medium bg-[#E8F5E8] px-1.5 py-0.5 rounded">
                          Default
                        </Text>
                      )}
                    </View>
                    {selectedSchedule?.id === schedule.id && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Location Dropdown Modal */}
          <Modal
            visible={showLocationDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLocationDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowLocationDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Select Location</Text>
                {conferencingLoading ? (
                  <Text className="text-base text-[#666] text-center py-4">Loading locations...</Text>
                ) : getLocationOptions().length === 0 ? (
                  <Text className="text-base text-[#8E8E93] text-center py-4">No locations available</Text>
                ) : (
                  getLocationOptions().map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        selectedLocation === option.label ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        setSelectedLocation(option.label);
                        setShowLocationDropdown(false);
                      }}>
                      <View className="flex-row items-center flex-1">
                        {option.iconUrl ? (
                          <SvgImage
                            uri={option.iconUrl}
                            width={24}
                            height={24}
                            style={{ marginRight: 12 }}
                          />
                        ) : (
                          <View style={{ width: 24, height: 24, backgroundColor: '#FF6B6B', borderRadius: 4, marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>?</Text>
                          </View>
                        )}
                        <Text className={`text-base text-[#333] ${selectedLocation === option.label ? "font-semibold" : ""}`}>
                          {option.label}
                        </Text>
                      </View>
                      {selectedLocation === option.label && <Ionicons name="checkmark" size={20} color="#000" />}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Before Event Buffer Dropdown Modal */}
          <Modal
            visible={showBeforeBufferDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBeforeBufferDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowBeforeBufferDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Before event buffer</Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      beforeEventBuffer === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setBeforeEventBuffer(option);
                      setShowBeforeBufferDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${beforeEventBuffer === option ? "font-semibold" : ""}`}>
                      {option}
                    </Text>
                    {beforeEventBuffer === option && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* After Event Buffer Dropdown Modal */}
          <Modal
            visible={showAfterBufferDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAfterBufferDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowAfterBufferDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">After event buffer</Text>
                {bufferTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      afterEventBuffer === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setAfterEventBuffer(option);
                      setShowAfterBufferDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${afterEventBuffer === option ? "font-semibold" : ""}`}>
                      {option}
                    </Text>
                    {afterEventBuffer === option && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Minimum Notice Unit Dropdown Modal */}
          <Modal
            visible={showMinimumNoticeUnitDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMinimumNoticeUnitDropdown(false)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowMinimumNoticeUnitDropdown(false)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Time unit</Text>
                {timeUnitOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                      minimumNoticeUnit === option ? "bg-[#F0F0F0]" : ""
                    }`}
                    onPress={() => {
                      setMinimumNoticeUnit(option);
                      setShowMinimumNoticeUnitDropdown(false);
                    }}>
                    <Text className={`text-base text-[#333] ${minimumNoticeUnit === option ? "font-semibold" : ""}`}>
                      {option}
                    </Text>
                    {minimumNoticeUnit === option && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Frequency Unit Dropdown Modal */}
          <Modal
            visible={showFrequencyUnitDropdown !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFrequencyUnitDropdown(null)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowFrequencyUnitDropdown(null)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Frequency unit</Text>
                {frequencyUnitOptions.map((option) => {
                  const selectedLimit = frequencyLimits.find(
                    (limit) => limit.id === showFrequencyUnitDropdown
                  );
                  const isSelected = selectedLimit?.unit === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        isSelected ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        if (showFrequencyUnitDropdown) {
                          updateFrequencyLimit(showFrequencyUnitDropdown, "unit", option);
                        }
                        setShowFrequencyUnitDropdown(null);
                      }}>
                      <Text className={`text-base text-[#333] ${isSelected ? "font-semibold" : ""}`}>
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#000" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Duration Unit Dropdown Modal */}
          <Modal
            visible={showDurationUnitDropdown !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDurationUnitDropdown(null)}>
            <TouchableOpacity className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center" onPress={() => setShowDurationUnitDropdown(null)}>
              <View className="bg-white rounded-2xl p-5 min-w-[250px] max-w-[80%]">
                <Text className="text-lg font-semibold text-[#333] mb-4 text-center">Duration unit</Text>
                {durationUnitOptions.map((option) => {
                  const selectedLimit = durationLimits.find((limit) => limit.id === showDurationUnitDropdown);
                  const isSelected = selectedLimit?.unit === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      className={`flex-row justify-between items-center py-3 px-4 rounded-lg mb-1 ${
                        isSelected ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        if (showDurationUnitDropdown) {
                          updateDurationLimit(showDurationUnitDropdown, "unit", option);
                        }
                        setShowDurationUnitDropdown(null);
                      }}>
                      <Text className={`text-base text-[#333] ${isSelected ? "font-semibold" : ""}`}>
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#000" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>

          {activeTab === "availability" && (
            <View className="bg-white rounded-2xl p-6">
              <View className="mb-5">
                <Text className="text-base font-semibold text-[#333] mb-2">Availability</Text>
                <TouchableOpacity
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                  onPress={() => setShowScheduleDropdown(true)}
                  disabled={schedulesLoading}>
                  <Text className="text-base text-black">
                    {schedulesLoading
                      ? "Loading schedules..."
                      : selectedSchedule
                      ? selectedSchedule.name
                      : "Select schedule"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {selectedSchedule && (
                <View className="mt-5 pt-5 border-t border-[#F0F0F0]">
                  <Text className="text-base font-semibold text-[#333] mb-3">Schedule</Text>
                  {scheduleDetailsLoading ? (
                    <View className="py-4 items-center">
                      <Text className="text-sm text-[#8E8E93] italic">Loading schedule details...</Text>
                    </View>
                  ) : selectedScheduleDetails ? (
                    getDaySchedule().map((dayInfo, index) => (
                      <View key={index} className="flex-row justify-between items-center py-2 border-b border-[#F0F0F0]">
                        <Text
                          className={`text-[15px] font-medium text-[#333] flex-1 ${
                            !dayInfo.available ? "line-through text-[#8E8E93]" : ""
                          }`}>
                          {dayInfo.day}
                        </Text>
                        <Text className="text-[15px] text-[#666] text-right">
                          {dayInfo.available && dayInfo.startTime && dayInfo.endTime
                            ? `${formatTime(dayInfo.startTime)} - ${formatTime(dayInfo.endTime)}`
                            : "Unavailable"}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View className="py-4 items-center">
                      <Text className="text-sm text-[#8E8E93] italic">Failed to load schedule details</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab === "limits" && (
            <View className="gap-4">
              {/* Buffer Time Card */}
              <View className="bg-white rounded-2xl p-6 shadow-md">
                <View className="mb-5">
                  <Text className="text-base font-semibold text-[#333] mb-2">Before event</Text>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                    onPress={() => setShowBeforeBufferDropdown(true)}>
                    <Text className="text-base text-black">{beforeEventBuffer}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <View className="mb-5">
                  <Text className="text-base font-semibold text-[#333] mb-2">After event</Text>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                    onPress={() => setShowAfterBufferDropdown(true)}>
                    <Text className="text-base text-black">{afterEventBuffer}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Minimum Notice Card */}
              <View className="bg-white rounded-2xl p-6 shadow-md">
                <View className="mb-5">
                  <Text className="text-base font-semibold text-[#333] mb-2">Minimum Notice</Text>
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                      value={minimumNoticeValue}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9]/g, "");
                        const num = parseInt(numericValue) || 0;
                        if (num >= 0) {
                          setMinimumNoticeValue(numericValue || "0");
                        }
                      }}
                      placeholder="1"
                      placeholderTextColor="#8E8E93"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                      onPress={() => setShowMinimumNoticeUnitDropdown(true)}>
                      <Text className="text-base text-black">{minimumNoticeUnit}</Text>
                      <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Booking Frequency Limit Card */}
              <View className="bg-white rounded-2xl p-6 shadow-md">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-4">
                    <Text className="text-base text-[#333] font-medium mb-1">Limit booking frequency</Text>
                    <Text className="text-sm text-[#666] leading-5">
                      Limit how many times this event can be booked.
                    </Text>
                  </View>
                  <Switch
                    value={limitBookingFrequency}
                    onValueChange={toggleBookingFrequency}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <Animated.View
                  style={[
                    { overflow: "hidden" },
                    {
                      opacity: frequencyAnimationValue,
                      maxHeight: frequencyAnimationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 500],
                      }),
                    },
                  ]}>
                  {limitBookingFrequency && (
                    <>
                      {frequencyLimits.map((limit, index) => (
                        <View key={limit.id} className="flex-row items-center mt-4 gap-3">
                          <TextInput
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                            value={limit.value}
                            onChangeText={(text) => {
                              const numericValue = text.replace(/[^0-9]/g, "");
                              const num = parseInt(numericValue) || 0;
                              if (num >= 0) {
                                updateFrequencyLimit(limit.id, "value", numericValue || "0");
                              }
                            }}
                            placeholder="1"
                            placeholderTextColor="#8E8E93"
                            keyboardType="numeric"
                          />
                          <TouchableOpacity
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                            onPress={() => setShowFrequencyUnitDropdown(limit.id)}>
                            <Text className="text-base text-black">{limit.unit}</Text>
                            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                          </TouchableOpacity>
                          {frequencyLimits.length > 1 && (
                            <TouchableOpacity
                              className="w-10 h-10 justify-center items-center bg-[#FFF1F0] rounded-lg border border-[#FFCCC7]"
                              onPress={() => removeFrequencyLimit(limit.id)}>
                              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        className="flex-row items-center justify-center mt-4 py-3 px-4 bg-transparent border border-black rounded-lg gap-2"
                        onPress={addFrequencyLimit}>
                        <Ionicons name="add" size={20} color="#000" />
                        <Text className="text-base text-black font-medium">Add Limit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </Animated.View>
              </View>

              {/* Total Booking Duration Limit Card */}
              <View className="bg-white rounded-2xl p-6 shadow-md">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-4">
                    <Text className="text-base text-[#333] font-medium mb-1">Limit total booking duration</Text>
                    <Text className="text-sm text-[#666] leading-5">
                      Limit total amount of time that this event can be booked.
                    </Text>
                  </View>
                  <Switch
                    value={limitTotalDuration}
                    onValueChange={toggleTotalDuration}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <Animated.View
                  style={[
                    { overflow: "hidden" },
                    {
                      opacity: durationAnimationValue,
                      maxHeight: durationAnimationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 500],
                      }),
                    },
                  ]}>
                  {limitTotalDuration && (
                    <>
                      {durationLimits.map((limit, index) => (
                        <View key={limit.id} className="flex-row items-center mt-4 gap-3">
                          <View className="flex-row items-center gap-3">
                            <TextInput
                              className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                              value={limit.value}
                              onChangeText={(text) => {
                                const numericValue = text.replace(/[^0-9]/g, "");
                                const num = parseInt(numericValue) || 0;
                                if (num >= 0) {
                                  updateDurationLimit(limit.id, "value", numericValue || "0");
                                }
                              }}
                              placeholder="60"
                              placeholderTextColor="#8E8E93"
                              keyboardType="numeric"
                            />
                            <Text className="text-base text-[#666]">Minutes</Text>
                          </View>
                          <TouchableOpacity
                            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                            onPress={() => setShowDurationUnitDropdown(limit.id)}>
                            <Text className="text-base text-black">{limit.unit}</Text>
                            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                          </TouchableOpacity>
                          {durationLimits.length > 1 && (
                            <TouchableOpacity
                              className="w-10 h-10 justify-center items-center bg-[#FFF1F0] rounded-lg border border-[#FFCCC7]"
                              onPress={() => removeDurationLimit(limit.id)}>
                              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        className="flex-row items-center justify-center mt-4 py-3 px-4 bg-transparent border border-black rounded-lg gap-2"
                        onPress={addDurationLimit}>
                        <Ionicons name="add" size={20} color="#000" />
                        <Text className="text-base text-black font-medium">Add Limit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </Animated.View>
              </View>
            </View>
          )}

          {activeTab === "advanced" && (
            <View className="bg-white rounded-2xl p-6 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Advanced Settings</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Configure advanced options for this event type.</Text>
            </View>
          )}

          {activeTab === "recurring" && (
            <View className="bg-white rounded-2xl p-6 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Recurring Events</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Set up recurring event patterns.</Text>
            </View>
          )}

          {activeTab === "apps" && (
            <View className="bg-white rounded-2xl p-6 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Connected Apps</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Manage app integrations for this event type.</Text>
            </View>
          )}

          {activeTab === "workflows" && (
            <View className="bg-white rounded-2xl p-6 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Workflows</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Configure automated workflows and actions.</Text>
            </View>
          )}

          {activeTab === "webhooks" && (
            <View className="bg-white rounded-2xl p-6 shadow-md">
              <Text className="text-lg font-semibold text-[#333] mb-4">Webhooks</Text>
              <Text className="text-base text-[#666] leading-6 mb-6">Set up webhook endpoints for event notifications.</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Action Bar */}
        <GlassView
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingTop: 16,
            paddingHorizontal: 20,
            backgroundColor: "#f8f9fa",
            borderTopWidth: 0.5,
            borderTopColor: "#E5E5EA",
            paddingBottom: insets.bottom + 12,
          }}
          glassEffectStyle="clear">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-medium text-[#333]">Hidden</Text>
              <Switch
                value={isHidden}
                onValueChange={setIsHidden}
                trackColor={{ false: "#E5E5EA", true: "#000" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center gap-3">
              <GlassView className="rounded-full overflow-hidden bg-[rgba(255,255,255,0.1)]" glassEffectStyle="clear">
                <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={handlePreview}>
                  <Ionicons name="open-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView className="rounded-full overflow-hidden bg-[rgba(255,255,255,0.1)]" glassEffectStyle="clear">
                <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={handleCopyLink}>
                  <Ionicons name="link-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView className="rounded-full overflow-hidden bg-[rgba(255,255,255,0.1)]" glassEffectStyle="clear">
                <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </GlassView>
            </View>
          </View>
        </GlassView>
      </View>
    </>
  );
}