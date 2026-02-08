import type { NativeStackHeaderItemMenuAction } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useState } from "react";
import { useColorScheme } from "react-native";

import { BookingListScreen } from "@/components/booking-list-screen/BookingListScreen";
import { useEventTypes } from "@/hooks";
import { useActiveBookingFilter } from "@/hooks/useActiveBookingFilter";

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const { data: eventTypes } = useEventTypes();

  // Use the active booking filter hook
  const { activeFilter, filterOptions, filterParams, handleFilterChange } = useActiveBookingFilter(
    "upcoming",
    () => {
      // Clear dependent filters when status filter changes
      setSearchQuery("");
      setSelectedEventTypeId(null);
    }
  );

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#FFFFFF" : "#000000";

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearEventTypeFilter = () => {
    setSelectedEventTypeId(null);
  };

  const buildActiveBookingFilter = () => {
    const currentFilterOption = filterOptions.find((option) => option.key === activeFilter);
    const statusMenuItems: NativeStackHeaderItemMenuAction[] = filterOptions.map((option) => {
      const isSelected = activeFilter === option.key;
      return {
        type: "action",
        label: option.label,
        icon: {
          name: isSelected
            ? "checkmark.circle.fill"
            : option.key === "upcoming"
              ? "calendar"
              : option.key === "unconfirmed"
                ? "questionmark.circle"
                : option.key === "recurring"
                  ? "repeat.circle"
                  : option.key === "past"
                    ? "checkmark.circle"
                    : "xmark.circle",
          type: "sfSymbol",
        },
        onPress: () => {
          handleFilterChange(option.key);
        },
      } satisfies NativeStackHeaderItemMenuAction;
    });

    return {
      type: "menu" as const,
      label: currentFilterOption?.label || "Filter",
      labelStyle: {
        fontWeight: "600",
        color: textColor,
      },
      menu: {
        title: "Filter by Status",
        items: statusMenuItems,
      },
    };
  };

  const buildEventTypeFilterMenu = () => {
    const eventTypeMenuItems: NativeStackHeaderItemMenuAction[] = (eventTypes || []).map(
      (eventType) => {
        const isSelected = selectedEventTypeId === eventType.id;
        return {
          type: "action",
          label: eventType.title,
          icon: {
            name: "calendar.badge.clock",
            type: "sfSymbol",
          },
          state: isSelected ? "on" : "off",
          onPress: () => {
            // Toggle behavior: if already selected, clear filter; otherwise, select it
            if (isSelected) {
              clearEventTypeFilter();
            } else {
              setSelectedEventTypeId(eventType.id);
            }
          },
        };
      }
    );

    const clearFilterItem: NativeStackHeaderItemMenuAction[] =
      selectedEventTypeId !== null
        ? [
            {
              type: "action",
              label: "Clear filter",
              icon: {
                name: "xmark.circle",
                type: "sfSymbol",
              },
              onPress: () => {
                clearEventTypeFilter();
              },
            },
          ]
        : [];

    const menuItems = [...eventTypeMenuItems, ...clearFilterItem];

    return {
      type: "menu" as const,
      label: "Filter by Event Type",
      icon: {
        name: "line.3.horizontal.decrease",
        type: "sfSymbol",
      },
      labelStyle: {
        fontWeight: "600",
        color: textColor,
      },
      menu: {
        title: menuItems.length > 0 ? "Filter by Event Type" : "No Event Types",
        items: [
          ...menuItems,
          // Show message if no event types available
          ...(menuItems.length === 0
            ? [
                {
                  type: "action",
                  label: "No event types available",
                  onPress: () => {},
                } satisfies NativeStackHeaderItemMenuAction,
              ]
            : []),
        ],
      },
    };
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Bookings",
          headerBlurEffect: isLiquidGlassAvailable() ? undefined : isDark ? "dark" : "light",
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerLargeTitleEnabled: true,
          headerSearchBarOptions: {
            placeholder: "Search bookings",
            onChangeText: (e) => handleSearch(e.nativeEvent.text),
            obscureBackground: false,
            barTintColor: isDark ? "#171717" : "#fff",
          },
          unstable_headerRightItems: () => {
            const eventTypeFilterMenu = buildEventTypeFilterMenu();
            const statusFilterMenu = buildActiveBookingFilter();

            return [eventTypeFilterMenu, statusFilterMenu];
          },
        }}
      />

      <BookingListScreen
        searchQuery={searchQuery}
        selectedEventTypeId={selectedEventTypeId}
        activeFilter={activeFilter}
        filterParams={filterParams}
        iosStyle={true}
      />
    </>
  );
}
