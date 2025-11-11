import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalComAPIService, Schedule } from "../services/calcom";

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
  const { id, title, description, duration, price, currency } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    price?: string;
    currency?: string;
  }>();

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("basics");

  // Form state
  const [eventTitle, setEventTitle] = useState(title || "");
  const [eventDescription, setEventDescription] = useState(description || "");
  const [eventSlug, setEventSlug] = useState("example-meeting");
  const [eventDuration, setEventDuration] = useState(duration || "30");
  const [allowMultipleDurations, setAllowMultipleDurations] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("Cal Video");
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

  // TODO: get locations from API
  const locationOptions = ["Cal Video", "Google Meet"];
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

  useEffect(() => {
    if (activeTab === "availability") {
      fetchSchedules();
    }
  }, [activeTab]);

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
      // Build the event type link and open it
      const eventTypeSlug = eventSlug || "preview"; // Use current slug or fallback
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);
      // You can open this link externally or show it in a webview
      console.log("Preview link:", link);
      // For now, we'll just log it. In a real app, you'd open it with Linking.openURL
    } catch (error) {
      console.error("Failed to generate preview link:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const eventTypeSlug = eventSlug || "event-link";
      const link = await CalComAPIService.buildEventTypeLink(eventTypeSlug);
      // Copy to clipboard (you'd use Clipboard.setString in a real app)
      console.log("Link copied:", link);
      // Show success message
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleDelete = () => {
    // Show confirmation dialog
    console.log("Delete event type:", id);
    // In a real app, you'd show an alert and call the delete API
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Glass Header */}
        <GlassView style={[styles.header, { paddingTop: insets.top + 8 }]} glassEffectStyle="clear">
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {truncateTitle(title)}
            </Text>

            <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </GlassView>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { paddingTop: insets.top + 70 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}>
                <View style={styles.tabContent}>
                  <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? "#000" : "#666"} />
                  <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {activeTab === "basics" && (
            <View style={styles.basicsTabs}>
              {/* Title and Description Card */}
              <View style={styles.card}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Title</Text>
                  <TextInput
                    style={styles.textInput}
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    placeholder="Enter event title"
                    placeholderTextColor="#8E8E93"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    placeholder="Enter event description"
                    placeholderTextColor="#8E8E93"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>URL</Text>
                  <View style={styles.urlInputContainer}>
                    <Text style={styles.urlPrefix}>cal.com/username/</Text>
                    <TextInput
                      style={styles.urlInput}
                      value={eventSlug}
                      onChangeText={setEventSlug}
                      placeholder="event-slug"
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                </View>
              </View>

              {/* Duration Card */}
              <View style={styles.card}>
                {!allowMultipleDurations && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <View style={styles.durationInputContainer}>
                      <TextInput
                        style={styles.numberInput}
                        value={eventDuration}
                        onChangeText={setEventDuration}
                        placeholder="30"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                      />
                      <Text style={styles.durationSuffix}>Minutes</Text>
                    </View>
                  </View>
                )}

                {allowMultipleDurations && (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Available durations</Text>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowDurationDropdown(true)}>
                        <Text style={styles.dropdownText}>
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
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Default duration</Text>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => setShowDefaultDurationDropdown(true)}>
                          <Text style={styles.dropdownText}>
                            {defaultDuration || "Select default duration"}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Allow multiple durations</Text>
                  <Switch
                    value={allowMultipleDurations}
                    onValueChange={setAllowMultipleDurations}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Location Card */}
              <View style={styles.card}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowLocationDropdown(true)}>
                    <Text style={styles.dropdownText}>{selectedLocation}</Text>
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
            <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDurationDropdown(false)}>
              <View style={styles.multiSelectModal}>
                <Text style={styles.modalTitle}>Select Available Durations</Text>
                <ScrollView style={styles.modalScrollView}>
                  {availableDurations.map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.dropdownOption,
                        selectedDurations.includes(duration) && styles.selectedOption,
                      ]}
                      onPress={() => toggleDurationSelection(duration)}>
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          selectedDurations.includes(duration) && styles.selectedOptionText,
                        ]}>
                        {duration}
                      </Text>
                      {selectedDurations.includes(duration) && (
                        <Ionicons name="checkmark" size={20} color="#000" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDurationDropdown(false)}>
                  <Text style={styles.modalCloseButtonText}>Done</Text>
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
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setShowDefaultDurationDropdown(false)}>
              <View style={styles.dropdownModal}>
                <Text style={styles.modalTitle}>Select Default Duration</Text>
                {selectedDurations.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[styles.dropdownOption, defaultDuration === duration && styles.selectedOption]}
                    onPress={() => {
                      setDefaultDuration(duration);
                      setShowDefaultDurationDropdown(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        defaultDuration === duration && styles.selectedOptionText,
                      ]}>
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
            <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowScheduleDropdown(false)}>
              <View style={styles.dropdownModal}>
                <Text style={styles.modalTitle}>Select Schedule</Text>
                {schedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[
                      styles.dropdownOption,
                      selectedSchedule?.id === schedule.id && styles.selectedOption,
                    ]}
                    onPress={() => {
                      setSelectedSchedule(schedule);
                      setShowScheduleDropdown(false);
                      fetchScheduleDetails(schedule.id);
                    }}>
                    <View style={styles.scheduleOptionContent}>
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          selectedSchedule?.id === schedule.id && styles.selectedOptionText,
                        ]}>
                        {schedule.name}
                      </Text>
                      {schedule.isDefault && <Text style={styles.defaultBadgeText}>Default</Text>}
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
            <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowLocationDropdown(false)}>
              <View style={styles.dropdownModal}>
                <Text style={styles.modalTitle}>Select Location</Text>
                {locationOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.dropdownOption, selectedLocation === option && styles.selectedOption]}
                    onPress={() => {
                      setSelectedLocation(option);
                      setShowLocationDropdown(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        selectedLocation === option && styles.selectedOptionText,
                      ]}>
                      {option}
                    </Text>
                    {selectedLocation === option && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {activeTab === "availability" && (
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Availability</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowScheduleDropdown(true)}
                  disabled={schedulesLoading}>
                  <Text style={styles.dropdownText}>
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
                <View style={styles.scheduleTable}>
                  <Text style={styles.scheduleTableTitle}>Schedule</Text>
                  {scheduleDetailsLoading ? (
                    <View style={styles.scheduleLoadingContainer}>
                      <Text style={styles.scheduleLoadingText}>Loading schedule details...</Text>
                    </View>
                  ) : selectedScheduleDetails ? (
                    getDaySchedule().map((dayInfo, index) => (
                      <View key={index} style={styles.scheduleRow}>
                        <Text style={[styles.dayText, !dayInfo.available && styles.unavailableDayText]}>
                          {dayInfo.day}
                        </Text>
                        <Text style={styles.timeText}>
                          {dayInfo.available && dayInfo.startTime && dayInfo.endTime
                            ? `${formatTime(dayInfo.startTime)} - ${formatTime(dayInfo.endTime)}`
                            : "Unavailable"}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.scheduleLoadingContainer}>
                      <Text style={styles.scheduleLoadingText}>Failed to load schedule details</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab === "limits" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Event Limits</Text>
              <Text style={styles.description}>Set booking limits and restrictions.</Text>
            </View>
          )}

          {activeTab === "advanced" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Advanced Settings</Text>
              <Text style={styles.description}>Configure advanced options for this event type.</Text>
            </View>
          )}

          {activeTab === "recurring" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recurring Events</Text>
              <Text style={styles.description}>Set up recurring event patterns.</Text>
            </View>
          )}

          {activeTab === "apps" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Connected Apps</Text>
              <Text style={styles.description}>Manage app integrations for this event type.</Text>
            </View>
          )}

          {activeTab === "workflows" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Workflows</Text>
              <Text style={styles.description}>Configure automated workflows and actions.</Text>
            </View>
          )}

          {activeTab === "webhooks" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Webhooks</Text>
              <Text style={styles.description}>Set up webhook endpoints for event notifications.</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Action Bar */}
        <GlassView style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.actionBarContent}>
            <View style={styles.hiddenSection}>
              <Text style={styles.hiddenLabel}>Hidden</Text>
              <Switch
                value={isHidden}
                onValueChange={setIsHidden}
                trackColor={{ false: "#E5E5EA", true: "#000" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.actionButtons}>
              <GlassView style={styles.glassButton} glassEffectStyle="clear">
                <TouchableOpacity style={styles.actionButton} onPress={handlePreview}>
                  <Ionicons name="open-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView style={styles.glassButton} glassEffectStyle="clear">
                <TouchableOpacity style={styles.actionButton} onPress={handleCopyLink}>
                  <Ionicons name="link-outline" size={20} color="#000" />
                </TouchableOpacity>
              </GlassView>

              <GlassView style={styles.glassDeleteButton} glassEffectStyle="clear">
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </GlassView>
            </View>
          </View>
        </GlassView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginHorizontal: 10,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#000000",
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tabsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#C6C6C8",
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeTab: {
    backgroundColor: "#EEEFF2",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "600",
  },
  basicsTabs: {
    gap: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  urlInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    overflow: "hidden",
  },
  urlPrefix: {
    backgroundColor: "#E5E5EA",
    color: "#666",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  urlInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  durationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  numberInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
    width: 80,
    textAlign: "center",
  },
  durationSuffix: {
    fontSize: 16,
    color: "#666",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  switchLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  dropdownButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    minWidth: 250,
    maxWidth: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: "#F0F0F0",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedOptionText: {
    fontWeight: "600",
  },
  multiSelectModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    minWidth: 300,
    maxWidth: "90%",
    maxHeight: "80%",
  },
  modalScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  modalCloseButton: {
    backgroundColor: "#000000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scheduleOptionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  defaultBadgeText: {
    fontSize: 12,
    color: "#34C759",
    fontWeight: "500",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scheduleTable: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  scheduleTableTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  dayText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  unavailableDayText: {
    textDecorationLine: "line-through",
    color: "#8E8E93",
  },
  timeText: {
    fontSize: 15,
    color: "#666",
    textAlign: "right",
  },
  scheduleLoadingContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  scheduleLoadingText: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  content: {
    flex: 1,
    paddingTop: 180,
    paddingBottom: 100, // Add bottom padding for action bar
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5EA",
  },
  actionBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hiddenSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hiddenLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  glassButton: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  glassDeleteButton: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255, 59, 48, 0.2)",
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginRight: 12,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 24,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 16,
    color: "#666",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#34C759",
  },
  detailsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: "#666",
  },
  actionSection: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
});
