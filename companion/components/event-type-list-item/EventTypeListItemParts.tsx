import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Tooltip } from "@/components/Tooltip";
import type { EventType } from "@/services/types/event-types.types";

interface EventTypeTitleProps {
  title: string;
}

export function EventTypeTitle({ title }: EventTypeTitleProps) {
  return (
    <View className="mb-1 flex-row items-center">
      <Text className="flex-1 text-base font-semibold text-cal-text">{title}</Text>
    </View>
  );
}

interface EventTypeDescriptionProps {
  normalizedDescription: string | null;
}

export function EventTypeDescription({ normalizedDescription }: EventTypeDescriptionProps) {
  if (!normalizedDescription) return null;
  return (
    <Text className="mb-2 mt-0.5 text-sm leading-5 text-cal-text-secondary" numberOfLines={2}>
      {normalizedDescription}
    </Text>
  );
}

interface DurationBadgeProps {
  formattedDuration: string;
}

export function DurationBadge({ formattedDuration }: DurationBadgeProps) {
  return (
    <View className="mt-2 flex-row items-center self-start rounded-lg border border-cal-border bg-cal-border px-2 py-1">
      <Ionicons name="time-outline" size={14} color="#000000" />
      <Text className="ml-1.5 text-xs font-semibold text-cal-brand-black">{formattedDuration}</Text>
    </View>
  );
}

interface PriceAndConfirmationBadgesProps {
  hasPrice: boolean;
  formattedPrice: string | null;
  requiresConfirmation?: boolean;
}

export function PriceAndConfirmationBadges({
  hasPrice,
  formattedPrice,
  requiresConfirmation,
}: PriceAndConfirmationBadgesProps) {
  if (!hasPrice && !requiresConfirmation) return null;
  return (
    <View className="mt-2 flex-row items-center gap-3">
      {hasPrice && formattedPrice ? (
        <Text className="text-sm font-medium text-cal-accent-success">{formattedPrice}</Text>
      ) : null}
      {requiresConfirmation ? (
        <View className="rounded bg-cal-accent-warning px-2 py-0.5">
          <Text className="text-xs font-medium text-white">Requires Confirmation</Text>
        </View>
      ) : null}
    </View>
  );
}

interface EventTypeActionsProps {
  item: EventType;
  copiedEventTypeId: number | null;
  handleCopyLink: (item: EventType) => void;
  handlePreview: (item: EventType) => void;
  handleEventTypeLongPress: (item: EventType) => void;
}

export function EventTypeActions({
  item,
  copiedEventTypeId,
  handleCopyLink,
  handlePreview,
  handleEventTypeLongPress,
}: EventTypeActionsProps) {
  return (
    <View className="flex-row">
      <Tooltip text="Preview">
        <TouchableOpacity
          className="items-center justify-center rounded-l-lg border border-r-0 border-cal-border"
          style={{ width: 32, height: 32 }}
          onPress={() => handlePreview(item)}
        >
          <Ionicons name="open-outline" size={18} color="#3C3F44" />
        </TouchableOpacity>
      </Tooltip>
      <Tooltip text={copiedEventTypeId === item.id ? "Copied!" : "Copy link"}>
        <TouchableOpacity
          className="items-center justify-center border border-r-0 border-cal-border"
          style={{ width: 32, height: 32 }}
          onPress={() => handleCopyLink(item)}
        >
          {copiedEventTypeId === item.id ? (
            <Ionicons name="checkmark" size={18} color="#34C759" />
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
          className="items-center justify-center rounded-r-lg border border-cal-border"
          style={{ width: 32, height: 32 }}
          onPress={() => handleEventTypeLongPress(item)}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
        </TouchableOpacity>
      </Tooltip>
    </View>
  );
}
