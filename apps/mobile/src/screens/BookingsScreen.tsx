import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import ApiService from "../services/api";

interface Slot {
  start: string;
  end?: string;
}

interface SlotsData {
  [date: string]: Slot[];
}

export default function BookingsScreen() {
  const [slotsData, setSlotsData] = useState<SlotsData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSlots = async () => {
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const params = {
        start: today.toISOString().split("T")[0],
        end: nextWeek.toISOString().split("T")[0],
        format: "range",
      };

      const response = await ApiService.getAvailableSlots(params);
      if (response.status === "success" && response.data) {
        setSlotsData(response.data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch available slots");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSlots();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderSlot = ({ item }: { item: Slot }) => (
    <TouchableOpacity style={styles.slotCard}>
      <View style={styles.slotInfo}>
        <Text style={styles.slotTime}>
          {formatTime(item.start)}
          {item.end && ` - ${formatTime(item.end)}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderDateSection = ({ item }: { item: [string, Slot[]] }) => {
    const [date, slots] = item;

    return (
      <View style={styles.dateSection}>
        <Text style={styles.dateHeader}>{formatDate(date)}</Text>
        <FlatList
          data={slots}
          renderItem={renderSlot}
          keyExtractor={(slot, index) => `${date}-${index}`}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const dateEntries = Object.entries(slotsData);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading available slots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dateEntries}
        renderItem={renderDateSection}
        keyExtractor={(item) => item[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No available slots found</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
          </View>
        }
        contentContainerStyle={dateEntries.length === 0 ? styles.emptyList : undefined}
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
  dateSection: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginHorizontal: 15,
    marginBottom: 10,
    marginTop: 10,
  },
  slotCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 2,
    padding: 15,
    borderRadius: 8,
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
  slotInfo: {
    flex: 1,
  },
  slotTime: {
    fontSize: 16,
    color: "#333",
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
