import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
import { Header } from "../../components/Header";

export default function EventTypes() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [filteredEventTypes, setFilteredEventTypes] = useState<EventType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchEventTypes = async () => {
    try {
      setError(null);

      const data = await CalComAPIService.getEventTypes();

      if (isMountedRef.current) {
        if (Array.isArray(data)) {
          setEventTypes(data);
          setFilteredEventTypes(data);
        } else {
          setEventTypes([]);
          setFilteredEventTypes([]);
        }
      }
    } catch (err) {
      console.error("🎯 EventTypesScreen: Error fetching event types:", err);
      if (isMountedRef.current) {
        setError("Failed to load event types. Please check your API key and try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
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

            // Only update state if component is still mounted
            if (isMountedRef.current) {
              // Remove the deleted event type from local state
              const updatedEventTypes = eventTypes.filter((et) => et.id !== eventType.id);
              setEventTypes(updatedEventTypes);
              setFilteredEventTypes(updatedEventTypes);

              Alert.alert("Success", "Event type deleted successfully");
            }
          } catch (error) {
            console.error("Failed to delete event type:", error);
            if (isMountedRef.current) {
              Alert.alert("Error", "Failed to delete event type. Please try again.");
            }
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

  const renderEventType = ({ item, index }: { item: EventType; index: number }) => {
    const duration = getDuration(item);
    const isLast = index === filteredEventTypes.length - 1;

    return (
      <TouchableOpacity
        className={`bg-white active:bg-[#F8F9FA] ${!isLast ? "border-b border-[#E5E5EA]" : ""}`}
        onPress={() => handleEventTypePress(item)}
        onLongPress={() => handleEventTypeLongPress(item)}
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-1">
              <Text className="text-base font-semibold text-[#333] flex-1">{item.title}</Text>
            </View>
            {item.description && (
              <Text className="text-sm text-[#666] leading-5 mt-0.5 mb-2" numberOfLines={2}>
                {normalizeMarkdown(item.description)}
              </Text>
            )}
            <View className="bg-[#E5E5EA] border border-[#E5E5EA] rounded-lg px-2 py-1 mt-2 flex-row items-center self-start">
              <Ionicons name="time-outline" size={14} color="#000" />
              <Text className="text-xs text-black font-semibold ml-1.5">{formatDuration(duration)}</Text>
            </View>
            {(item.price != null && item.price > 0) || item.requiresConfirmation ? (
              <View className="flex-row items-center mt-2 gap-3">
                {item.price != null && item.price > 0 && (
                  <Text className="text-sm font-medium text-[#34C759]">
                    {item.currency || "$"}
                    {item.price}
                  </Text>
                )}
                {item.requiresConfirmation && (
                  <View className="bg-[#FF9500] px-2 py-0.5 rounded">
                    <Text className="text-xs font-medium text-white">Requires Confirmation</Text>
                  </View>
                )}
              </View>
            ) : null}
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
      <View className="flex-1 bg-gray-100 pt-[54px]">
        <View className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200"
            placeholder="Search event types"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View className="flex-1 justify-center items-center p-5 bg-gray-50">
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text className="text-xl font-bold mt-4 mb-2 text-gray-800">No event types found</Text>
          <Text className="text-base text-gray-500 text-center">Create your first event type in Cal.com</Text>
        </View>
      </View>
    );
  }

  if (filteredEventTypes.length === 0 && searchQuery.trim() !== "") {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200"
            placeholder="Search event types"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View className="flex-1 justify-center items-center p-5 bg-gray-50">
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text className="text-xl font-bold mt-4 mb-2 text-gray-800">No results found</Text>
          <Text className="text-base text-gray-500 text-center">Try searching with different keywords</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <Header />
      <View className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
        <TextInput
          className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200"
          placeholder="Search event types"
          placeholderTextColor="#8E8E93"
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
      <ScrollView
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4">
          <View className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden">
            {filteredEventTypes.map((item, index) => (
              <View key={item.id.toString()}>
                {renderEventType({ item, index })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
