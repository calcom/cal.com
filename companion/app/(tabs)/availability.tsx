import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ActionSheetIOS,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";

import { CalComAPIService, Schedule } from "../../services/calcom";
import { Header } from "../../components/Header";

export default function Availability() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSchedules = async () => {
    try {
      setError(null);

      // Fetch all schedules
      const allSchedules = await CalComAPIService.getSchedules();

      // Sort schedules: default first, then by name
      const sortedSchedules = allSchedules.sort((a, b) => {
        // Default schedule first
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        // Then sort by name alphabetically
        return a.name.localeCompare(b.name);
      });

      setSchedules(sortedSchedules);
      setFilteredSchedules(sortedSchedules);
    } catch (err) {
      setError("Failed to load availability. Please check your API key and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Refresh schedules when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only refresh if not currently loading (to avoid duplicate calls)
      if (!loading && !refreshing) {
        fetchSchedules();
      }
    }, [loading, refreshing])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredSchedules(schedules);
    } else {
      const filtered = schedules.filter((schedule) =>
        schedule.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSchedules(filtered);
    }
  };

  const handleScheduleLongPress = (schedule: Schedule) => {
    if (Platform.OS !== "ios") {
      // Fallback for non-iOS platforms (Android Alert supports max 3 buttons)
      const options = [];
      if (!schedule.isDefault) {
        options.push({ text: "⭐ Set as default", onPress: () => handleSetAsDefault(schedule) });
      }
      options.push(
        { text: "📋 Duplicate", onPress: () => handleDuplicate(schedule) },
        { text: "🗑️ Delete", style: "destructive", onPress: () => handleDelete(schedule) }
      );
      // Android Alert automatically adds cancel, so we don't need to include it explicitly
      Alert.alert(schedule.name, "", options);
      return;
    }

    const options = ["Cancel"];
    if (!schedule.isDefault) {
      options.push("⭐ Set as default");
    }
    options.push("📋 Duplicate", "🗑️ Delete");

    const destructiveButtonIndex = options.length - 1; // Delete button
    const cancelButtonIndex = 0;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex,
        cancelButtonIndex,
        title: schedule.name,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex) {
          return;
        }

        if (!schedule.isDefault) {
          // Options: ["Cancel", "⭐ Set as default", "📋 Duplicate", "🗑️ Delete"]
          if (buttonIndex === 1) {
            handleSetAsDefault(schedule);
          } else if (buttonIndex === 2) {
            handleDuplicate(schedule);
          } else if (buttonIndex === 3) {
            handleDelete(schedule);
          }
        } else {
          // Options: ["Cancel", "📋 Duplicate", "🗑️ Delete"]
          if (buttonIndex === 1) {
            handleDuplicate(schedule);
          } else if (buttonIndex === 2) {
            handleDelete(schedule);
          }
        }
      }
    );
  };

  const handleSetAsDefault = async (schedule: Schedule) => {
    try {
      await CalComAPIService.updateSchedule(schedule.id, { isDefault: true });
      await fetchSchedules();
    } catch (err) {
      Alert.alert("Error", "Failed to set schedule as default. Please try again.");
    }
  };

  const handleDuplicate = async (schedule: Schedule) => {
    try {
      await CalComAPIService.duplicateSchedule(schedule.id);
      await fetchSchedules();
    } catch (err) {
      Alert.alert("Error", "Failed to duplicate schedule. Please try again.");
    }
  };

  const handleDelete = (schedule: Schedule) => {
    if (Platform.OS === "web") {
      // Use custom modal for web
      setShowDeleteModal(true);
    } else {
      // Use native Alert for iOS/Android
      Alert.alert("Delete Schedule", `Are you sure you want to delete "${schedule.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await CalComAPIService.deleteSchedule(schedule.id);
              await fetchSchedules();
            } catch (err) {
              Alert.alert("Error", "Failed to delete schedule. Please try again.");
            }
          },
        },
      ]);
    }
  };

  const confirmDelete = async () => {
    if (!selectedSchedule) return;

    try {
      setDeleting(true);
      await CalComAPIService.deleteSchedule(selectedSchedule.id);
      setShowDeleteModal(false);
      setSelectedSchedule(null);
      await fetchSchedules();
    } catch (err) {
      Alert.alert("Error", "Failed to delete schedule. Please try again.");
      setDeleting(false);
    }
  };

  const handleSchedulePress = (schedule: Schedule) => {
    router.push({
      pathname: "/availability-detail",
      params: { id: schedule.id.toString() },
    });
  };

  const handleCreateNew = () => {
    setNewScheduleName("");
    setShowCreateModal(true);
  };

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) {
      Alert.alert("Error", "Please enter a schedule name");
      return;
    }

    try {
      setCreating(true);

      // Get user's timezone (default to America/New_York if not available)
      let userTimezone = "America/New_York";
      try {
        const userProfile = await CalComAPIService.getUserProfile();
        if (userProfile.timeZone) {
          userTimezone = userProfile.timeZone;
        }
      } catch (error) {
        console.log("Could not get user timezone, using default");
      }

      // Create schedule with Monday-Friday 9 AM - 5 PM default
      const newSchedule = await CalComAPIService.createSchedule({
        name: newScheduleName.trim(),
        timeZone: userTimezone,
        isDefault: false,
        availability: [
          {
            days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            startTime: "09:00",
            endTime: "17:00",
          },
        ],
      });

      setShowCreateModal(false);
      setNewScheduleName("");

      // Navigate to edit the newly created schedule
      router.push({
        pathname: "/availability-detail",
        params: {
          id: newSchedule.id.toString(),
        },
      });

      // Refresh the list
      fetchSchedules();
    } catch (error) {
      console.error("Failed to create schedule:", error);
      Alert.alert("Error", "Failed to create schedule. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const renderSchedule = ({ item: schedule, index }: { item: Schedule; index: number }) => {
    return (
      <TouchableOpacity
        className="border-b border-[#E5E5EA] bg-white active:bg-[#F8F9FA]"
        onPress={() => handleSchedulePress(schedule)}
        onLongPress={() => handleScheduleLongPress(schedule)}
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-4 flex-1">
            <View className="mb-1 flex-row flex-wrap items-center">
              <Text className="text-base font-semibold text-[#333]">{schedule.name}</Text>
              {schedule.isDefault && (
                <View className="ml-2 rounded bg-[#666] px-2 py-0.5">
                  <Text className="text-xs font-semibold text-white">Default</Text>
                </View>
              )}
            </View>

            {schedule.availability && schedule.availability.length > 0 ? (
              <View>
                {schedule.availability.map((slot, slotIndex) => (
                  <View
                    key={`${schedule.id}-${slot.days.join("-")}-${slotIndex}`}
                    className={slotIndex > 0 ? "mt-2" : ""}
                  >
                    <Text className="text-sm text-[#666]">
                      {slot.days.join(", ")} {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-[#666]">No availability set</Text>
            )}

            <View className="mt-2 flex-row items-center">
              <Ionicons name="globe-outline" size={14} color="#666" />
              <Text className="ml-1.5 text-sm text-[#666]">{schedule.timeZone}</Text>
            </View>
          </View>

          {/* Three dots button - vertically centered on the right */}
          <TouchableOpacity
            className="items-center justify-center rounded-lg border border-[#E5E5EA]"
            style={{ width: 32, height: 32 }}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedSchedule(schedule);
              setShowActionsModal(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8f9fa]">
        <Header />
        <View className="flex-1 items-center justify-center p-5">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-base text-[#666]">Loading availability...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-[#f8f9fa]">
        <Header />
        <View className="flex-1 items-center justify-center p-5">
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-[#333]">
            Unable to load availability
          </Text>
          <Text className="mb-6 text-center text-base text-[#666]">{error}</Text>
          <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={fetchSchedules}>
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (schedules.length === 0 && !loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
            placeholder="Search schedules"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
            onPress={handleCreateNew}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-base font-semibold text-white">New</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text className="mb-2 mt-4 text-xl font-bold text-[#333]">No schedules found</Text>
          <Text className="text-center text-base text-[#666]">
            Create your availability schedule in Cal.com
          </Text>
        </View>
      </View>
    );
  }

  if (filteredSchedules.length === 0 && searchQuery.trim() !== "") {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
            placeholder="Search schedules"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
            onPress={handleCreateNew}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-base font-semibold text-white">New</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text className="mb-2 mt-4 text-xl font-bold text-[#333]">No results found</Text>
          <Text className="text-center text-base text-[#666]">
            Try searching with different keywords
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <Header />
      <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
        <TextInput
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
          placeholder="Search schedules"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
          onPress={handleCreateNew}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-base font-semibold text-white">New</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-1 px-2 pt-4 md:px-4">
        <View className="flex-1 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          <FlatList
            data={filteredSchedules}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSchedule}
            contentContainerStyle={{ paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Create Schedule Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <View
            className="w-[90%] max-w-[500px] rounded-2xl bg-white"
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
              <Text className="text-2xl font-semibold text-[#111827]">Add a new schedule</Text>
            </View>

            {/* Content */}
            <View className="px-8 pb-6">
              <View className="mb-1">
                <Text className="mb-2 text-sm font-medium text-[#374151]">Name</Text>
                <TextInput
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2.5 text-base text-[#111827]"
                  placeholder="Working Hours"
                  placeholderTextColor="#9CA3AF"
                  value={newScheduleName}
                  onChangeText={setNewScheduleName}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleCreateSchedule}
                />
              </View>
            </View>

            {/* Footer */}
            <View className="rounded-b-2xl border-t border-[#E5E7EB] bg-[#F9FAFB] px-8 py-4">
              <View className="flex-row justify-end gap-2 space-x-2">
                <TouchableOpacity
                  className="rounded-xl border border-[#D1D5DB] bg-white px-2 py-2 md:px-4"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewScheduleName("");
                  }}
                  disabled={creating}
                >
                  <Text className="text-base font-medium text-[#374151]">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`rounded-xl bg-[#111827] px-2 py-2 md:px-4 ${creating ? "opacity-60" : ""}`}
                  onPress={handleCreateSchedule}
                  disabled={creating}
                >
                  <Text className="text-base font-medium text-white">Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Schedule Actions Modal */}
      <Modal
        visible={showActionsModal}
        transparent
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
                Schedule Actions
              </Text>
            </View>

            {/* Actions List */}
            <View className="p-2">
              {/* Set as Default - only show if not already default */}
              {selectedSchedule && !selectedSchedule.isDefault && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setShowActionsModal(false);
                      if (selectedSchedule) {
                        handleSetAsDefault(selectedSchedule);
                      }
                    }}
                    className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                  >
                    <Ionicons name="star-outline" size={20} color="#6B7280" />
                    <Text className="ml-3 text-base text-gray-900">Set as Default</Text>
                  </TouchableOpacity>

                  <View className="mx-4 my-2 h-px bg-gray-200" />
                </>
              )}

              {/* Duplicate */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  if (selectedSchedule) {
                    setTimeout(() => {
                      handleDuplicate(selectedSchedule);
                    }, 100);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="copy-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Duplicate</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Delete */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  if (selectedSchedule) {
                    // Small delay to ensure modal closes before alert shows
                    setTimeout(() => {
                      handleDelete(selectedSchedule);
                    }, 100);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text className="ml-3 text-base text-red-500">Delete</Text>
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
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6">
            {/* Icon */}
            <View className="mb-4 items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </View>
            </View>

            {/* Title */}
            <Text className="mb-2 text-center text-xl font-semibold text-gray-900">
              Delete Schedule
            </Text>

            {/* Description */}
            <Text className="mb-6 text-center text-base text-gray-600">
              Are you sure you want to delete "{selectedSchedule?.name}"? This action cannot be
              undone.
            </Text>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-lg bg-gray-100 px-4 py-3"
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text className="text-center text-base font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-lg bg-gray-900 px-4 py-3 ${deleting ? "opacity-50" : ""}`}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text className="text-center text-base font-semibold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
