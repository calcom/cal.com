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

interface Schedule {
  id: number;
  name: string;
  isDefault: boolean;
  timeZone: string;
  availability: any[];
}

export default function AvailabilityScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedules = async () => {
    try {
      const response = await ApiService.getSchedules();
      if (response.status === "success" && response.data) {
        setSchedules(response.data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch schedules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert("Delete Schedule", `Are you sure you want to delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiService.deleteSchedule(id.toString());
            setSchedules(schedules.filter((s) => s.id !== id));
            Alert.alert("Success", "Schedule deleted successfully");
          } catch (error) {
            Alert.alert("Error", "Failed to delete schedule");
          }
        },
      },
    ]);
  };

  const renderSchedule = ({ item }: { item: Schedule }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleInfo}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleName}>{item.name}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.scheduleTimezone}>{item.timeZone}</Text>
        <Text style={styles.scheduleAvailability}>{item.availability?.length || 0} availability rules</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.name)}
        disabled={item.isDefault}>
        <Ionicons name="trash-outline" size={20} color={item.isDefault ? "#ccc" : "#ff4444"} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading schedules...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={schedules}
        renderItem={renderSchedule}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No schedules found</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
          </View>
        }
        contentContainerStyle={schedules.length === 0 ? styles.emptyList : undefined}
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
  scheduleCard: {
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
  scheduleInfo: {
    flex: 1,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginRight: 10,
  },
  defaultBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  scheduleTimezone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  scheduleAvailability: {
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
