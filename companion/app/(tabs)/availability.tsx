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
} from "react-native";

import { CalComAPIService, Schedule, ScheduleAvailability } from "../../services/calcom";

export default function Availability() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const renderSchedule = ({ item: schedule }: { item: Schedule }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleSchedulePress(schedule)}
      onLongPress={() => handleScheduleLongPress(schedule)}
      className="mb-6"
    >
      <View className="bg-white rounded-xl p-4 shadow" style={{ position: "relative" }}>
        <View className="flex-row items-center mb-3">
          <Text className="text-xl font-bold text-[#333] mr-2 flex-1">{schedule.name}</Text>
          {schedule.isDefault && (
            <View className="bg-[#34C759] px-2 py-0.5 rounded">
              <Text className="text-white text-xs font-semibold">Default</Text>
            </View>
          )}
        </View>
        
        <View className="flex-row items-center mb-3">
          <Ionicons name="globe-outline" size={16} color="#666" />
          <Text className="text-sm text-[#666] ml-1">{schedule.timeZone}</Text>
        </View>
        
        {schedule.availability && schedule.availability.length > 0 ? (
          <View>
            {schedule.availability.map((slot, index) => (
              <View key={`${schedule.id}-${slot.days.join("-")}-${index}`} className={index > 0 ? "mt-3 pt-3 border-t border-[#E5E5EA]" : ""}>
                <View className="mb-2">
                  <Text className="text-base font-semibold text-[#333]">{slot.days.join(", ")}</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text className="text-sm text-[#666] ml-1.5">
                    {slot.startTime} - {slot.endTime}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-[#666]">No availability set</Text>
        )}
        
        <View style={{ position: "absolute", bottom: 16, right: 16 }}>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-[#f8f9fa]">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-[#666]">Loading availability...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-[#f8f9fa]">
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="text-xl font-bold mt-4 mb-2 text-[#333] text-center">Unable to load availability</Text>
        <Text className="text-base text-[#666] text-center mb-6">{error}</Text>
        <TouchableOpacity className="bg-black px-6 py-3 rounded-lg" onPress={fetchSchedules}>
          <Text className="text-white text-base font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (schedules.length === 0 && !loading) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-[#f8f9fa]">
        <Ionicons name="calendar-outline" size={64} color="#666" />
        <Text className="text-xl font-bold mt-4 mb-2 text-[#333]">No schedules found</Text>
        <Text className="text-base text-[#666] text-center">Create your availability schedule in Cal.com</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f8f9fa] pt-16">
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSchedule}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-4">
            <Text className="text-2xl font-bold text-[#333] mb-2">Availability</Text>
            <Text className="text-base text-[#666]">Configure times when you are available for bookings.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
