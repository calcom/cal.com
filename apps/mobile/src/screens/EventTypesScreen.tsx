import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";

import ApiService from "../services/api";

interface EventType {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
  description?: string;
}

export default function EventTypesScreen() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEventTypes = async () => {
    try {
      const response = await ApiService.getEventTypes();
      if (response.status === "success" && response.data) {
        setEventTypes(response.data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch event types");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEventTypes();
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert("Delete Event Type", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiService.deleteEventType(id.toString());
            setEventTypes(eventTypes.filter((et) => et.id !== id));
            Alert.alert("Success", "Event type deleted successfully");
          } catch (error) {
            Alert.alert("Error", "Failed to delete event type");
          }
        },
      },
    ]);
  };

  const renderEventType = ({ item }: { item: EventType }) => (
    <View style={styles.eventTypeCard}>
      <View style={styles.eventTypeInfo}>
        <Text style={styles.eventTypeTitle}>{item.title}</Text>
        <Text style={styles.eventTypeSlug}>/{item.slug}</Text>
        <Text style={styles.eventTypeDuration}>{item.lengthInMinutes} minutes</Text>
        {item.description && (
          <Text style={styles.eventTypeDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id, item.title)}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading event types...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={eventTypes}
        renderItem={renderEventType}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="link-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No event types found</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
          </View>
        }
        contentContainerStyle={eventTypes.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  eventTypeCard: {
    backgroundColor: "#fff",
    margin: 10,
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTypeInfo: {
    flex: 1,
  },
  eventTypeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  eventTypeSlug: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  eventTypeDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  eventTypeDescription: {
    fontSize: 14,
    color: "#888",
  },
  deleteButton: {
    padding: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
});
