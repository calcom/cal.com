import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Tooltip } from "../../components/Tooltip";
import { EventTypeListItemProps } from "./types";
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
}: EventTypeListItemProps) => {
  const duration = getEventDuration(item);
  const isLast = index === filteredEventTypes.length - 1;

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
    <TouchableOpacity
      className={`bg-white active:bg-[#F8F9FA] ${!isLast ? "border-b border-[#E5E5EA]" : ""}`}
      onPress={() => handleEventTypePress(item)}
      onLongPress={() => handleEventTypeLongPress(item)}
      style={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="mr-4 flex-1">
          <View className="mb-1 flex-row items-center">
            <Text className="flex-1 text-base font-semibold text-[#333]">{item.title}</Text>
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
        <View className="flex-row">
          <Tooltip text="Preview">
            <TouchableOpacity
              className="items-center justify-center rounded-l-lg border border-r-0 border-[#E5E5EA]"
              style={{ width: 32, height: 32 }}
              onPress={() => handlePreview(item)}
            >
              <Ionicons name="open-outline" size={18} color="#3C3F44" />
            </TouchableOpacity>
          </Tooltip>
          <Tooltip text={copiedEventTypeId === item.id ? "Copied!" : "Copy link"}>
            <TouchableOpacity
              className="items-center justify-center border border-r-0 border-[#E5E5EA]"
              style={{ width: 32, height: 32 }}
              onPress={() => handleCopyLink(item)}
            >
              {copiedEventTypeId === item.id ? (
                <Ionicons name="checkmark" size={18} color="#10B981" />
              ) : (
                <Svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3C3F44"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </Svg>
              )}
            </TouchableOpacity>
          </Tooltip>
          <Tooltip text="More">
            <TouchableOpacity
              className="items-center justify-center rounded-r-lg border border-[#E5E5EA]"
              style={{ width: 32, height: 32 }}
              onPress={() => handleEventTypeLongPress(item)}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
            </TouchableOpacity>
          </Tooltip>
        </View>
      </View>
    </TouchableOpacity>
  );
};
