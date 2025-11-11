import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
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
            const updatedEventTypes = eventTypes.filter(et => et.id !== eventType.id);
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

  const renderEventType = ({ item }: { item: EventType }) => {
    const duration = getDuration(item);

    return (
      <TouchableOpacity style={styles.listItem} onPress={() => handleEventTypePress(item)}>
        <View style={styles.listItemContent}>
          <View style={styles.listItemMain}>
            <Text style={styles.listItemTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.listItemSubtitle} numberOfLines={1}>
                {normalizeMarkdown(item.description)}
              </Text>
            )}
          </View>

          <View style={styles.listItemRight}>
            <Text style={styles.listItemDuration}>{formatDuration(duration)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
          </View>
        </View>

        {(item.price || item.requiresConfirmation) && (
          <View style={styles.listItemDetails}>
            {item.price != null && item.price > 0 && (
              <Text style={styles.listItemPrice}>
                {item.currency || "$"}
                {item.price}
              </Text>
            )}
            {item.requiresConfirmation && (
              <View style={styles.listItemBadge}>
                <Text style={styles.listItemBadgeText}>Requires Confirmation</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading event types...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Unable to load event types</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEventTypes}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search event types"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No event types found</Text>
          <Text style={styles.emptyText}>Create your first event type in Cal.com</Text>
        </View>
      </View>
    );
  }

  if (filteredEventTypes.length === 0 && searchQuery.trim() !== "") {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search event types"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>Try searching with different keywords</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search event types"
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filteredEventTypes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEventType}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingTop: 54,
  },
  searchContainer: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#C6C6C8",
  },
  searchBar: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 17,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  listContainer: {
    paddingVertical: 0,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  listItem: {
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#C6C6C8",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemMain: {
    flex: 1,
    marginRight: 12,
  },
  listItemTitle: {
    fontSize: 17,
    fontWeight: "400",
    color: "#000",
    lineHeight: 22,
  },
  listItemSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 20,
    marginTop: 1,
  },
  listItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listItemDuration: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "400",
  },
  listItemDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  listItemPrice: {
    fontSize: 15,
    fontWeight: "500",
    color: "#34C759",
  },
  listItemBadge: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listItemBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#fff",
  },
});
