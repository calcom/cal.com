import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type React from "react";
import { Pressable, useColorScheme, View } from "react-native";
import { EventTypeBadges, EventTypeDescription, EventTypeTitle } from "./EventTypeListItemParts";
import type { EventTypeListItemProps } from "./types";
import { useEventTypeListItemData } from "./useEventTypeListItemData";

export const EventTypeListItem = ({
  item,
  index,
  filteredEventTypes,
  handleEventTypePress,
  handleCopyLink,
  onEdit,
  onDuplicate,
  onDelete,
}: EventTypeListItemProps) => {
  const { formattedDuration, normalizedDescription, hasPrice, formattedPrice } =
    useEventTypeListItemData(item);
  const isLast = index === filteredEventTypes.length - 1;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Calculate badge count to force remount when badges change
  // This fixes SwiftUI Host caching stale layout measurements
  const hasSeats =
    item.seats &&
    !("disabled" in item.seats && item.seats.disabled) &&
    "seatsPerTimeSlot" in item.seats &&
    item.seats.seatsPerTimeSlot &&
    item.seats.seatsPerTimeSlot > 0;
  const hasRecurrence =
    item.recurrence &&
    !("disabled" in item.recurrence && item.recurrence.disabled) &&
    "occurrences" in item.recurrence &&
    item.recurrence.occurrences;
  const requiresConfirmation =
    item.confirmationPolicy &&
    !("disabled" in item.confirmationPolicy && item.confirmationPolicy.disabled) &&
    "type" in item.confirmationPolicy &&
    item.confirmationPolicy.type === "always";

  const badgeCount = [
    true, // duration always present
    item.hidden,
    hasSeats,
    hasPrice,
    hasRecurrence,
    requiresConfirmation,
  ].filter(Boolean).length;

  type ButtonSystemImage = React.ComponentProps<typeof Button>["systemImage"];
  type EventTypeIcon = Exclude<ButtonSystemImage, undefined>;

  const eventTypes: {
    label: string;
    icon: EventTypeIcon;
    onPress: () => void;
    role: "default" | "destructive";
  }[] = [
    {
      label: "Copy link",
      icon: "link",
      onPress: () => handleCopyLink(item),
      role: "default",
    },
    {
      label: "Edit",
      icon: "pencil",
      onPress: () => onEdit?.(item),
      role: "default",
    },
    {
      label: "Duplicate",
      icon: "square.on.square",
      onPress: () => onDuplicate?.(item),
      role: "default",
    },
    {
      label: "Delete",
      icon: "trash",
      onPress: () => onDelete?.(item),
      role: "destructive",
    },
  ];

  // Use minHeight based on badge count to ensure proper spacing
  // This fixes SwiftUI Host caching stale layout measurements
  return (
    <View
      style={{
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
        borderBottomWidth: !isLast ? 1 : 0,
        borderBottomColor: isDark ? "#4D4D4D" : "#E5E5EA",
      }}
    >
      {/* Calculate minHeight based on badge rows to ensure proper spacing */}
      {/* 1-3 badges = 1 row, 4-5 badges = likely 2 rows, 6 badges = 2 rows */}
      <View
        className="flex-row items-start justify-between"
        style={{
          paddingVertical: 16,
          minHeight: badgeCount <= 3 ? 100 : badgeCount <= 5 ? 120 : 160,
        }}
      >
        <Pressable
          onPress={() => handleEventTypePress(item)}
          style={{
            paddingLeft: 16,
            paddingBottom: 10,
            flex: 1,
            marginRight: 12,
          }}
        >
          <EventTypeTitle
            title={item.title}
            username={item.users?.[0]?.username}
            slug={item.slug}
            bookingUrl={item.bookingUrl}
          />
          <EventTypeDescription normalizedDescription={normalizedDescription} />
          <EventTypeBadges
            formattedDuration={formattedDuration}
            hidden={item.hidden}
            seats={item.seats}
            hasPrice={hasPrice}
            formattedPrice={formattedPrice}
            confirmationPolicy={item.confirmationPolicy}
            recurrence={item.recurrence}
          />
        </Pressable>

        <View style={{ paddingRight: 16, paddingTop: 4, flexShrink: 0 }}>
          <Host matchContents>
            <ContextMenu
              modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
              activationMethod="singlePress"
            >
              <ContextMenu.Items>
                {eventTypes.map((eventType) => (
                  <Button
                    key={eventType.label}
                    systemImage={eventType.icon}
                    onPress={eventType.onPress}
                    role={eventType.role}
                    label={eventType.label}
                  />
                ))}
              </ContextMenu.Items>
              <ContextMenu.Trigger>
                <HStack>
                  <Image
                    systemName="ellipsis"
                    color="primary"
                    size={24}
                    modifiers={[frame({ height: 24, width: 17 })]}
                  />
                </HStack>
              </ContextMenu.Trigger>
            </ContextMenu>
          </Host>
        </View>
      </View>
    </View>
  );
};
