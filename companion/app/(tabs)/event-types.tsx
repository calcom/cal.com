import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from "react-native";

import { CalComAPIService, EventType } from "../../services/calcom";

export default function EventTypes() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventTypes = async () => {
    try {
      console.log("🎯 EventTypesScreen: Starting fetch...");
      setError(null);

      const data = await CalComAPIService.getEventTypes();

      console.log("🎯 EventTypesScreen: Data received:", data);
      console.log("🎯 EventTypesScreen: Data type:", typeof data);
      console.log("🎯 EventTypesScreen: Data is array:", Array.isArray(data));
      console.log("🎯 EventTypesScreen: Data length:", data?.length);

      if (Array.isArray(data)) {
        setEventTypes(data);
        console.log("🎯 EventTypesScreen: State updated with", data.length, "event types");
      } else {
        console.log("🎯 EventTypesScreen: Data is not an array, setting empty array");
        setEventTypes([]);
      }
    } catch (err) {
      console.error("🎯 EventTypesScreen: Error fetching event types:", err);
      setError("Failed to load event types. Please check your API key and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("🎯 EventTypesScreen: Fetch completed, loading set to false");
    }
  };

  useEffect(() => {
    console.log("🎯 EventTypesScreen: Component mounted, starting fetch...");
    fetchEventTypes();
  }, []);

  useEffect(() => {
    console.log(
      "🎯 EventTypesScreen: State changed - loading:",
      loading,
      "error:",
      error,
      "eventTypes count:",
      eventTypes.length
    );
  }, [loading, error, eventTypes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEventTypes();
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes || minutes <= 0) {
      return "0m";
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getDuration = (eventType: EventType): number => {
    // Prefer lengthInMinutes (API field), fallback to length for backwards compatibility
    return eventType.lengthInMinutes ?? eventType.length ?? 0;
  };

  const handleEventTypePress = (eventType: EventType) => {
    const duration = getDuration(eventType);
    Alert.alert(
      eventType.title,
      `${eventType.description || "No description"}\n\nDuration: ${formatDuration(duration)}`,
      [{ text: "OK" }]
    );
  };

  const renderEventType = ({ item }: { item: EventType }) => {
    const duration = getDuration(item);

    return (
      <TouchableOpacity
        className="mb-3 rounded-xl bg-white p-4 shadow-md"
        onPress={() => handleEventTypePress(item)}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="flex-1 text-lg font-semibold text-gray-800">{item.title}</Text>
        </View>

        {item.description && (
          <Text className="mb-2 text-sm leading-5 text-gray-500" numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <Text className="mb-3 text-sm font-medium text-gray-500">{formatDuration(duration)}</Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {item.price != null && item.price > 0 && (
              <Text className="text-sm font-semibold text-emerald-500">
                {item.currency || "$"}
                {item.price}
              </Text>
            )}
            {item.requiresConfirmation && (
              <View className="rounded bg-amber-500 px-2 py-0.5">
                <Text className="text-[10px] font-medium text-white">Requires Confirmation</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-5">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-gray-500">Loading event types...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-5">
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="mt-4 mb-2 text-center text-xl font-bold text-gray-800">
          Unable to load event types
        </Text>
        <Text className="mb-6 text-center text-base text-gray-500">{error}</Text>
        <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={fetchEventTypes}>
          <Text className="text-base font-semibold text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-5">
        <Ionicons name="calendar-outline" size={64} color="#666" />
        <Text className="mt-4 mb-2 text-xl font-bold text-gray-800">No event types found</Text>
        <Text className="text-center text-base text-gray-500">
          Create your first event type in Cal.com
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={eventTypes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEventType}
        className="px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
