import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EventTypeDetail() {
  const router = useRouter();
  const { id, title, description, duration, price, currency } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    price?: string;
    currency?: string;
  }>();

  const insets = useSafeAreaInsets();

  const formatDuration = (minutes: string) => {
    const mins = parseInt(minutes) || 0;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const truncateTitle = (text: string, maxLength: number = 20) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>

        {/* Glass Header */}
        <GlassView style={[styles.header, { paddingTop: insets.top + 8 }]} glassEffectStyle="clear">
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {truncateTitle(title)}
            </Text>

            <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </GlassView>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{title}</Text>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              </View>
            </View>

            {description && <Text style={styles.description}>{description}</Text>}

            {price && parseFloat(price) > 0 && (
              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Price</Text>
                <Text style={styles.priceValue}>
                  {currency || "$"}
                  {price}
                </Text>
              </View>
            )}

            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Event Details</Text>

              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Duration: {formatDuration(duration)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="videocam-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Video conferencing included</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Email confirmations sent</Text>
              </View>
            </View>

            <View style={styles.actionSection}>
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Book Meeting</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Share Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginHorizontal: 10,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#000000",
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingTop: 120,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginRight: 12,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 24,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 16,
    color: "#666",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#34C759",
  },
  detailsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: "#666",
  },
  actionSection: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
});
