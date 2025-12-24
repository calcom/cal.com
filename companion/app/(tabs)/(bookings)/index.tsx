import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";

import type { EventType } from "../../../services/calcom";
import { CalComAPIService } from "../../../services/calcom";
import { Header } from "../../../components/Header";
import { BookingListScreen } from "../../../components/booking-list-screen/BookingListScreen";
import { useActiveBookingFilter } from "../../../hooks/useActiveBookingFilter";

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const [selectedEventTypeLabel, setSelectedEventTypeLabel] = useState<string | null>(null);
  const [eventTypesLoading, setEventTypesLoading] = useState(false);

  // Use the active booking filter hook
  const { activeFilter, filterLabels, activeIndex, filterParams, handleSegmentChange } =
    useActiveBookingFilter("upcoming", () => {
      // Clear dependent filters when status filter changes
      setSearchQuery("");
      setSelectedEventTypeId(null);
      setSelectedEventTypeLabel(null);
    });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const fetchEventTypes = async () => {
    try {
      setEventTypesLoading(true);
      const types = await CalComAPIService.getEventTypes();
      setEventTypes(types);
    } catch (err) {
      console.error("Error fetching event types:", err);
      // Error is logged but not displayed to user for event type filter
    } finally {
      setEventTypesLoading(false);
    }
  };

  const handleFilterButtonPress = () => {
    setShowFilterModal(true);
    if (eventTypes.length === 0) {
      fetchEventTypes();
    }
  };

  const clearEventTypeFilter = () => {
    setSelectedEventTypeId(null);
    setSelectedEventTypeLabel(null);
  };

  const handleEventTypeSelect = (eventTypeId: number | null, label?: string | null) => {
    if (eventTypeId === null) {
      clearEventTypeFilter();
    } else {
      setSelectedEventTypeId(eventTypeId);
      setSelectedEventTypeLabel(label || null);
    }
    setShowFilterModal(false);
  };

  const supportsLiquidGlass = isLiquidGlassAvailable();

  const renderSegmentedControl = () => {
    const segmentedControlContent = (
      <SegmentedControl
        values={filterLabels}
        selectedIndex={activeIndex}
        onChange={handleSegmentChange}
        style={{ height: 40 }}
        appearance="light"
        activeFontStyle={{ color: "#007AFF", fontWeight: "600", fontSize: 14 }}
        fontStyle={{ color: "#8E8E93", fontSize: 14 }}
      />
    );

    return (
      <>
        {supportsLiquidGlass ? (
          <GlassView
            glassEffectStyle="regular"
            style={{ paddingHorizontal: 8, paddingVertical: 12 }}
          >
            {segmentedControlContent}
          </GlassView>
        ) : (
          <View className="border-b border-gray-200 bg-white px-2 py-3 md:px-4">
            {segmentedControlContent}
          </View>
        )}
        <View className="border-b border-gray-300 bg-gray-100 px-2 py-2 md:px-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="flex-row items-center rounded-lg border border-gray-200 bg-white"
              style={{ width: "20%", paddingHorizontal: 8, paddingVertical: 6 }}
              onPress={handleFilterButtonPress}
            >
              <Ionicons name="options-outline" size={14} color="#333" />
              <Text className="text-sm text-[#333]" style={{ marginLeft: 4 }}>
                Filter
              </Text>
            </TouchableOpacity>
            <View style={{ width: "75%" }}>
              <TextInput
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                placeholder="Search bookings"
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
          {selectedEventTypeId !== null ? (
            <View className="mt-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Text className="flex-1 text-sm text-[#333]">
                Filtered by {selectedEventTypeLabel || "event type"}
              </Text>
              <TouchableOpacity onPress={clearEventTypeFilter}>
                <Text className="text-sm font-semibold text-[#007AFF]">Clear filter</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </>
    );
  };

  return (
    <BookingListScreen
      renderHeader={() => <Header />}
      renderFilterControls={renderSegmentedControl}
      showFilterModal={showFilterModal}
      setShowFilterModal={setShowFilterModal}
      eventTypes={eventTypes}
      eventTypesLoading={eventTypesLoading}
      searchQuery={searchQuery}
      selectedEventTypeId={selectedEventTypeId}
      onEventTypeChange={handleEventTypeSelect}
      activeFilter={activeFilter}
      filterParams={filterParams}
    />
  );
}
