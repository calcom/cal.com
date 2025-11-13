import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActionSheetIOS,
  Share,
  Alert,
  Clipboard,
  Platform,
} from "react-native";

import { CalComAPIService, EventType } from "../../services/calcom";

export default function EventTypes() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [filteredEventTypes, setFilteredEventTypes] = useState<EventType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventTypes = async () => {
    try {
      setError(null);

      const data = await CalComAPIService.getEventTypes();

      if (Array.isArray(data)) {
        setEventTypes(data);
        setFilteredEventTypes(data);
      } else {
        setEventTypes([]);
        setFilteredEventTypes([]);
      }
    } catch (err) {
      console.error("🎯 EventTypesScreen: Error fetching event types:", err);
      setError("Failed to load event types. Please check your API key and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  useEffect(() => {}, [loading, error, eventTypes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEventTypes();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredEventTypes(eventTypes);
    } else {
      const filtered = eventTypes.filter(
        (eventType) =>
          eventType.title.toLowerCase().includes(query.toLowerCase()) ||
          (eventType.description && eventType.description.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredEventTypes(filtered);
    }
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

  const normalizeMarkdown = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Remove HTML tags including <br>, <div>, <p>, etc.
        .replace(/<[^>]*>/g, " ")
        // Convert HTML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        // Convert markdown links [text](url) to just text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Remove bold/italic markers **text** or *text*
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        // Remove inline code `text`
        .replace(/`([^`]+)`/g, "$1")
        // Remove strikethrough ~~text~~
        .replace(/~~([^~]+)~~/g, "$1")
        // Remove heading markers # ## ###
        .replace(/^#{1,6}\s+/gm, "")
        // Remove blockquote markers >
        .replace(/^>\s+/gm, "")
        // Remove list markers - * +
        .replace(/^[\s]*[-*+]\s+/gm, "")
        // Remove numbered list markers 1. 2. etc
        .replace(/^[\s]*\d+\.\s+/gm, "")
        // Normalize multiple whitespace/newlines to single space
        .replace(/\s+/g, " ")
        // Trim whitespace
        .trim()
    );
  };

  const handleEventTypePress = (eventType: EventType) => {
    handleEdit(eventType);
  };

  const handleEventTypeLongPress = (eventType: EventType) => {
    if (Platform.OS !== "ios") {
      // Fallback for non-iOS platforms
      Alert.alert(eventType.title, eventType.description || "", [
        { text: "Cancel", style: "cancel" },
        { text: "Copy Link", onPress: () => handleCopyLink(eventType) },
        { text: "Share", onPress: () => handleShare(eventType) },
        { text: "Edit", onPress: () => handleEdit(eventType) },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(eventType) },
      ]);
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Copy Link", "Share", "Edit", "Delete"],
        destructiveButtonIndex: 4, // Delete button
        cancelButtonIndex: 0,
        title: eventType.title,
        message: eventType.description ? normalizeMarkdown(eventType.description) : undefined,
      },
      (buttonIndex) => {
        switch (buttonIndex) {
          case 1: // Copy Link
            handleCopyLink(eventType);
            break;
          case 2: // Share
            handleShare(eventType);
            break;
          case 3: // Edit
            handleEdit(eventType);
            break;
          case 4: // Delete
            handleDelete(eventType);
            break;
          default:
            // Cancel - do nothing
            break;
        }
      }
    );
  };

  const handleCopyLink = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      Clipboard.setString(link);
      Alert.alert("Link Copied", "Event type link copied to clipboard");
    } catch (error) {
      Alert.alert("Error", "Failed to copy link. Please try again.");
    }
  };

  const handleShare = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      await Share.share({
        message: `Book a meeting: ${eventType.title}`,
        url: link,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share link. Please try again.");
    }
  };

  const handleEdit = (eventType: EventType) => {
    const duration = getDuration(eventType);
    router.push({
      pathname: "/event-type-detail",
      params: {
        id: eventType.id.toString(),
        title: eventType.title,
        description: eventType.description || "",
        duration: duration.toString(),
        price: eventType.price?.toString() || "",
        currency: eventType.currency || "",
        slug: eventType.slug || "",
      },
    });
  };

  const handleDelete = (eventType: EventType) => {
    Alert.alert("Delete Event Type", `Are you sure you want to delete "${eventType.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await CalComAPIService.deleteEventType(eventType.id);

            // Remove the deleted event type from local state
            const updatedEventTypes = eventTypes.filter((et) => et.id !== eventType.id);
            setEventTypes(updatedEventTypes);
            setFilteredEventTypes(updatedEventTypes);

            Alert.alert("Success", "Event type deleted successfully");
          } catch (error) {
            console.error("Failed to delete event type:", error);
            Alert.alert("Error", "Failed to delete event type. Please try again.");
          }
        },
      },
    ]);
  };

  const handleCreateNew = () => {
    // Navigate to create new event type
    router.push({
      pathname: "/event-type-detail",
      params: {
        id: "new",
        title: "",
        description: "",
        duration: "30",
        price: "",
        currency: "",
      },
    });
  };

  const renderEventType = ({ item }: { item: EventType }) => {
    const duration = getDuration(item);

    return (
      <TouchableOpacity
        className="border-b border-gray-300 bg-white px-4 py-3"
        onPress={() => handleEventTypePress(item)}
        onLongPress={() => handleEventTypeLongPress(item)}>
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="text-base leading-6 text-black">{item.title}</Text>
            {item.description && (
              <Text className="mt-0.5 text-sm leading-5 text-gray-500" numberOfLines={1}>
                {normalizeMarkdown(item.description)}
              </Text>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-gray-500">{formatDuration(duration)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
          </View>
        </View>

        {(item.price || item.requiresConfirmation) && (
          <View className="mt-2 flex-row items-center gap-2">
            {item.price != null && item.price > 0 && (
              <Text className="text-sm font-medium text-emerald-500">
                {item.currency || "$"}
                {item.price}
              </Text>
            )}
            {item.requiresConfirmation && (
              <View className="rounded bg-amber-500 px-1.5 py-0.5">
                <Text className="text-[11px] font-medium text-white">Requires Confirmation</Text>
              </View>
            )}
          </View>
        )}
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
      <View className="flex-1 bg-gray-100 pt-14">
        <View className="border-b border-gray-300 bg-gray-100 px-4 py-2">
          <TextInput
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-black"
            placeholder="Search event types"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text className="mt-4 mb-2 text-xl font-bold text-gray-800">No event types found</Text>
          <Text className="text-center text-base text-gray-500">
            Create your first event type in Cal.com
          </Text>
        </View>
      </View>
    );
  }

  if (filteredEventTypes.length === 0 && searchQuery.trim() !== "") {
    return (
      <View className="flex-1 bg-gray-100 pt-14">
        <View className="border-b border-gray-300 bg-gray-100 px-4 py-2">
          <TextInput
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-black"
            placeholder="Search event types"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text className="mt-4 mb-2 text-center text-xl font-bold text-gray-800">No results found</Text>
          <Text className="text-center text-base text-gray-500">Try searching with different keywords</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 pt-14">
      <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
        <TextInput
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-black"
          placeholder="Search event types"
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
          onPress={handleCreateNew}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-base font-semibold text-white">New</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredEventTypes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEventType}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
