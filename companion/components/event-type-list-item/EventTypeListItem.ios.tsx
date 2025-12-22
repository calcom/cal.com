import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Host, ContextMenu, Button, Image, HStack } from "@expo/ui/swift-ui";

import { buttonStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { EventTypeListItemProps } from "./types";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { getEventDuration } from "../../utils/getEventDuration";
import { normalizeMarkdown } from "../../utils/normalizeMarkdown";

export const EventTypeListItem = ({
  item,
  index,
  filteredEventTypes,
  copiedEventTypeId,
  handleEventTypePress,
  handleEventTypeLongPress,
  handleCopyLink,
  handlePreview,
  onEdit,
  onDuplicate,
  onDelete,
}: EventTypeListItemProps) => {
  const duration = getEventDuration(item);
  const isLast = index === filteredEventTypes.length - 1;

  const eventTypes: {
    label: string;
    icon: any;
    onPress: () => void;
    role: "default" | "destructive";
  }[] = [
    {
      label: "Preview",
      icon: "arrow.up.right.square",
      onPress: () => handlePreview(item),
      role: "default",
    },
    {
      label: "Copy link",
      icon: "link",
      onPress: () => handleCopyLink(item),
      role: "default",
    },
    {
      label: "Edit",
      icon: "pencil",
      onPress: () => onEdit(item),
      role: "default",
    },
    {
      label: "Duplicate",
      icon: "square.on.square",
      onPress: () => onDuplicate(item),
      role: "default",
    },
    {
      label: "Delete",
      icon: "trash",
      onPress: () => onDelete(item),
      role: "destructive",
    },
  ];

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

  return (
    <View className={`bg-white active:bg-[#F8F9FA] ${!isLast ? "border-b border-[#E5E5EA]" : ""}`}>
      <View className="flex-shrink-1 flex-row items-center justify-between">
        <Pressable
          onPress={() => handleEventTypePress(item)}
          style={{ paddingHorizontal: 16, paddingVertical: 16 }}
          className="flex-grow"
        >
          <View className="mr-4 flex-1">
            <View className="mb-1 flex-row items-center">
              <Text className="flex-1 text-base font-semibold text-[#333]">{item.title} </Text>
            </View>
            {item.description ? (
              <Text className="mb-2 mt-0.5 text-sm leading-5 text-[#666]" numberOfLines={2}>
                {normalizeMarkdown(item.description)}
              </Text>
            ) : null}
            <View className="mt-2 flex-row items-center self-start rounded-lg border border-[#E5E5EA] bg-[#E5E5EA] px-2 py-1">
              <Ionicons name="time-outline" size={14} color="#000" />
              <Text className="ml-1.5 text-xs font-semibold text-black">
                {formatDuration(duration)}
              </Text>
            </View>
            {(item.price != null && item.price > 0) || item.requiresConfirmation ? (
              <View className="mt-2 flex-row items-center gap-3">
                {item.price != null && item.price > 0 ? (
                  <Text className="text-sm font-medium text-[#34C759]">
                    {item.currency || "$"}
                    {item.price}
                  </Text>
                ) : null}
                {item.requiresConfirmation ? (
                  <View className="rounded bg-[#FF9500] px-2 py-0.5">
                    <Text className="text-xs font-medium text-white">Requires Confirmation</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </Pressable>

        <Host matchContents>
          <ContextMenu
            modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"), padding()]}
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
  );
};
