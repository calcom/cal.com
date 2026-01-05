import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { BookingListScreen } from "@/components/booking-list-screen/BookingListScreen";
import { Header } from "@/components/Header";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppPressable } from "@/components/AppPressable";
import { useActiveBookingFilter } from "@/hooks/useActiveBookingFilter";
import type { EventType } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import { safeLogError } from "@/utils/safeLogger";

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const [selectedEventTypeLabel, setSelectedEventTypeLabel] = useState<string | null>(null);
  const [eventTypesLoading, setEventTypesLoading] = useState(false);

  // Use the active booking filter hook
  const { activeFilter, filterOptions, filterParams, handleFilterChange } = useActiveBookingFilter(
    "upcoming",
    () => {
      // Clear dependent filters when status filter changes
      setSearchQuery("");
      setSelectedEventTypeId(null);
      setSelectedEventTypeLabel(null);
    }
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const fetchEventTypes = useCallback(async () => {
    setEventTypesLoading(true);
    try {
      const types = await CalComAPIService.getEventTypes();
      setEventTypes(types);
      setEventTypesLoading(false);
    } catch (err) {
      safeLogError("Error fetching event types:", err);
      // Error is logged but not displayed to user for event type filter
      setEventTypesLoading(false);
    }
  }, []);

  // Fetch event types on mount for dropdown
  useEffect(() => {
    if (eventTypes.length === 0) {
      fetchEventTypes();
    }
  }, [eventTypes.length, fetchEventTypes]);

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
  };

  const renderFilterControls = () => {
    const filterLabel =
      selectedEventTypeId !== null ? selectedEventTypeLabel || "Event Type" : "Filter";

    return (
      <View className="border-b border-gray-300 bg-gray-100 px-2 py-2 md:px-4">
        <View className="flex-row items-center gap-3">
          {/* Dropdown menu for event type filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AppPressable
                className="flex-row items-center rounded-lg border border-gray-200 bg-white"
                style={{ paddingHorizontal: 8, paddingVertical: 6 }}
              >
                <Ionicons name="options-outline" size={14} color="#333" />
                <Text
                  className={`text-sm ${selectedEventTypeId !== null ? "text-[#007AFF] font-semibold" : "text-[#333]"}`}
                  style={{ marginLeft: 4 }}
                  numberOfLines={1}
                >
                  {filterLabel}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#333" style={{ marginLeft: 2 }} />
              </AppPressable>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              insets={{ top: 60, bottom: 20, left: 12, right: 12 }}
              sideOffset={8}
              className="w-52"
              align="start"
            >
              {/* Clear filter option */}
              <DropdownMenuCheckboxItem
                checked={selectedEventTypeId === null}
                onCheckedChange={() => handleEventTypeSelect(null)}
              >
                <Text className="text-base">All Event Types</Text>
              </DropdownMenuCheckboxItem>

              {/* Event type options */}
              {eventTypes.map((eventType) => (
                <DropdownMenuCheckboxItem
                  key={eventType.id}
                  checked={selectedEventTypeId === eventType.id}
                  onCheckedChange={() => handleEventTypeSelect(eventType.id, eventType.title)}
                >
                  <Text className="text-base" numberOfLines={1}>
                    {eventType.title}
                  </Text>
                </DropdownMenuCheckboxItem>
              ))}

              {/* Loading state */}
              {eventTypesLoading && eventTypes.length === 0 && (
                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => {}}>
                  <Text className="text-base text-gray-500">Loading...</Text>
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <View style={{ flex: 1 }}>
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
      </View>
    );
  };

  return (
    <BookingListScreen
      renderHeader={() => (
        <Header
          filterOptions={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange as (filterKey: string) => void}
        />
      )}
      renderFilterControls={renderFilterControls}
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
