import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";

import { CalComAPIService, Schedule, ScheduleAvailability } from "../../services/calcom";

export default function Availability() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setError(null);

      // Try to get default schedule first
      const defaultSchedule = await CalComAPIService.getDefaultSchedule();

      if (defaultSchedule) {
        setSchedule(defaultSchedule);
      } else {
        // If no default, get all schedules and pick the first one
        const schedules = await CalComAPIService.getSchedules();
        if (schedules.length > 0) {
          setSchedule(schedules[0]);
        } else {
          setSchedule(null);
        }
      }
    } catch (err) {
      setError("Failed to load availability. Please check your API key and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const renderAvailabilitySlot = ({ item }: { item: ScheduleAvailability }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow">
      <View className="mb-2">
        <Text className="text-base font-semibold text-[#333]">{item.days.join(", ")}</Text>
      </View>
      <View className="flex-row items-center">
        <Ionicons name="time-outline" size={16} color="#666" />
        <Text className="text-sm text-[#666] ml-1.5">
          {item.startTime} - {item.endTime}
        </Text>
      </View>
    </View>
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
        <TouchableOpacity className="bg-black px-6 py-3 rounded-lg" onPress={fetchSchedule}>
          <Text className="text-white text-base font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!schedule) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-[#f8f9fa]">
        <Ionicons name="calendar-outline" size={64} color="#666" />
        <Text className="text-xl font-bold mt-4 mb-2 text-[#333]">No schedule found</Text>
        <Text className="text-base text-[#666] text-center">Create your availability schedule in Cal.com</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f8f9fa] pt-16">
      <View className="bg-white p-4 border-b border-[#e5e7eb]">
        <View className="flex-row items-center mb-2">
          <Text className="text-xl font-bold text-[#333] mr-2">{schedule.name}</Text>
          {schedule.isDefault && (
            <View className="bg-[#34C759] px-2 py-0.5 rounded">
              <Text className="text-white text-xs font-semibold">Default</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          <Ionicons name="globe-outline" size={16} color="#666" />
          <Text className="text-sm text-[#666] ml-1">{schedule.timeZone}</Text>
        </View>
      </View>

      <FlatList
        data={schedule.availability}
        keyExtractor={(item, index) => `${item.days.join("-")}-${index}`}
        renderItem={renderAvailabilitySlot}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<Text className="text-base font-semibold text-[#333] mb-3">Working Hours</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
