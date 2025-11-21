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
      const filtered = schedules.filter(
        (schedule) =>
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
    Alert.alert(
      "Delete Schedule",
      `Are you sure you want to delete "${schedule.name}"?`,
      [
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
      ]
    );
  };

  const handleSchedulePress = (schedule: Schedule) => {
    router.push({
      pathname: "/availability-detail",
      params: { id: schedule.id.toString() },
    });
  };

  const renderSchedule = ({ item: schedule, index }: { item: Schedule; index: number }) => {
    return (
      <TouchableOpacity
        className="bg-white active:bg-[#F8F9FA] border-b border-[#E5E5EA]"
        onPress={() => handleSchedulePress(schedule)}
        onLongPress={() => handleScheduleLongPress(schedule)}
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-1 flex-wrap">
              <Text className="text-base font-semibold text-[#333]">{schedule.name}</Text>
              {schedule.isDefault && (
                <View className="bg-[#666] px-2 py-0.5 rounded ml-2">
                  <Text className="text-white text-xs font-semibold">Default</Text>
                </View>
              )}
            </View>
            
            {schedule.availability && schedule.availability.length > 0 ? (
              <View>
                {schedule.availability.map((slot, slotIndex) => (
                  <View key={`${schedule.id}-${slot.days.join("-")}-${slotIndex}`} className={slotIndex > 0 ? "mt-2" : ""}>
                    <Text className="text-sm text-[#666]">
                      {slot.days.join(", ")} {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-[#666]">No availability set</Text>
            )}
            
            <View className="flex-row items-center mt-2">
              <Ionicons name="globe-outline" size={14} color="#666" />
              <Text className="text-sm text-[#666] ml-1.5">{schedule.timeZone}</Text>
            </View>
          </View>
          <View className="items-center justify-center border border-[#E5E5EA] rounded-lg" style={{ width: 32, height: 32 }}>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8f9fa]">
        <Header />
        <View className="flex-1 justify-center items-center p-5">
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
        <View className="flex-1 justify-center items-center p-5">
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text className="text-xl font-bold mt-4 mb-2 text-[#333] text-center">Unable to load availability</Text>
          <Text className="text-base text-[#666] text-center mb-6">{error}</Text>
          <TouchableOpacity className="bg-black px-6 py-3 rounded-lg" onPress={fetchSchedules}>
            <Text className="text-white text-base font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (schedules.length === 0 && !loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200 focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Search schedules"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity className="flex-row items-center justify-center gap-1 bg-black px-2.5 py-2 rounded-lg min-w-[60px]" onPress={handleCreateNew}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white text-base font-semibold">New</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 justify-center items-center p-5 bg-gray-50">
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text className="text-xl font-bold mt-4 mb-2 text-[#333]">No schedules found</Text>
          <Text className="text-base text-[#666] text-center">Create your availability schedule in Cal.com</Text>
        </View>
      </View>
    );
  }

  if (filteredSchedules.length === 0 && searchQuery.trim() !== "") {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200 focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Search schedules"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity className="flex-row items-center justify-center gap-1 bg-black px-2.5 py-2 rounded-lg min-w-[60px]" onPress={handleCreateNew}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white text-base font-semibold">New</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 justify-center items-center p-5 bg-gray-50">
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text className="text-xl font-bold mt-4 mb-2 text-[#333]">No results found</Text>
          <Text className="text-base text-[#666] text-center">Try searching with different keywords</Text>
        </View>
      </View>
    );
  }

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

  return (
    <View className="flex-1 bg-gray-100">
      <Header />
      <View className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
        <TextInput
          className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200 focus:ring-2 focus:ring-black focus:border-black"
          placeholder="Search schedules"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity className="flex-row items-center justify-center gap-1 bg-black px-2.5 py-2 rounded-lg min-w-[60px]" onPress={handleCreateNew}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white text-base font-semibold">New</Text>
        </TouchableOpacity>
      </View>
      <View className="px-2 md:px-4 pt-4 flex-1">
        <View className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden flex-1">
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
        onRequestClose={() => setShowCreateModal(false)}>
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
              <Text className="text-2xl font-semibold text-[#111827]">Add a new schedule</Text>
            </View>

            {/* Content */}
            <View className="px-8 pb-6">
              <View className="mb-1">
                <Text className="text-sm font-medium text-[#374151] mb-2">Name</Text>
                <TextInput
                  className="bg-white rounded-md px-3 py-2.5 text-base text-[#111827] border border-[#D1D5DB]"
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
            <View className="bg-[#F9FAFB] border-t border-[#E5E7EB] rounded-b-2xl px-8 py-4">
              <View className="flex-row justify-end space-x-2 gap-2">
                <TouchableOpacity
                  className="px-2 md:px-4 py-2 rounded-xl bg-white border border-[#D1D5DB]"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewScheduleName("");
                  }}
                  disabled={creating}>
                  <Text className="text-base font-medium text-[#374151]">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-2 md:px-4 py-2 bg-[#111827] rounded-xl ${creating ? "opacity-60" : ""}`}
                  onPress={handleCreateSchedule}
                  disabled={creating}>
                  <Text className="text-base font-medium text-white">
                    Continue
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
