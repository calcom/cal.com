import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";

import EditAvailabilityModal from "../../components/EditAvailabilityModal";
import { CalComAPIService, Schedule, ScheduleAvailability } from "../../services/calcom";

export default function Availability() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const fetchSchedule = async () => {
    try {
      console.log("📅 AvailabilityScreen: Starting fetch...");
      setError(null);

      // Try to get default schedule first
      const defaultSchedule = await CalComAPIService.getDefaultSchedule();

      if (defaultSchedule) {
        setSchedule(defaultSchedule);
        console.log("📅 AvailabilityScreen: Default schedule loaded");
      } else {
        // If no default, get all schedules and pick the first one
        const schedules = await CalComAPIService.getSchedules();
        if (schedules.length > 0) {
          setSchedule(schedules[0]);
          console.log("📅 AvailabilityScreen: First schedule loaded");
        } else {
          setSchedule(null);
          console.log("📅 AvailabilityScreen: No schedules found");
        }
      }
    } catch (err) {
      console.error("📅 AvailabilityScreen: Error fetching schedule:", err);
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

  const handleUpdateSchedule = async (updatedData: {
    name?: string;
    timeZone?: string;
    availability?: ScheduleAvailability[];
    isDefault?: boolean;
  }) => {
    if (!schedule) return;

    try {
      console.log("📅 AvailabilityScreen: Updating schedule...");
      const updatedSchedule = await CalComAPIService.updateSchedule(schedule.id, updatedData);
      setSchedule(updatedSchedule);
      console.log("📅 AvailabilityScreen: Schedule updated successfully");
    } catch (err) {
      fetchSchedule();
      console.error("📅 AvailabilityScreen: Error updating schedule:", err);
      throw err;
    }
  };

  const renderAvailabilitySlot = ({ item }: { item: ScheduleAvailability }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotHeader}>
        <Text style={styles.slotDays}>{item.days.join(", ")}</Text>
      </View>
      <View style={styles.slotTime}>
        <Ionicons name="time-outline" size={16} color="#666" />
        <Text style={styles.slotTimeText}>
          {item.startTime} - {item.endTime}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Unable to load availability</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSchedule}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!schedule) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={64} color="#666" />
        <Text style={styles.emptyTitle}>No schedule found</Text>
        <Text style={styles.emptyText}>Create your availability schedule in Cal.com</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.scheduleName}>{schedule.name}</Text>
          {schedule.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
          <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
            <Ionicons name="pencil" size={20} color="#000" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timezoneContainer}>
          <Ionicons name="globe-outline" size={16} color="#666" />
          <Text style={styles.timezoneText}>{schedule.timeZone}</Text>
        </View>
      </View>

      <FlatList
        data={schedule.availability}
        keyExtractor={(item, index) => `${item.days.join("-")}-${index}`}
        renderItem={renderAvailabilitySlot}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />

      {schedule && (
        <EditAvailabilityModal
          visible={editModalVisible}
          schedule={schedule}
          onClose={() => setEditModalVisible(false)}
          onSave={handleUpdateSchedule}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  scheduleName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: "#34C759",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  timezoneContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timezoneText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  slotCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  slotHeader: {
    marginBottom: 8,
  },
  slotDays: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  slotTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  slotTimeText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: "flex-start",
    marginLeft: "auto",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
});
