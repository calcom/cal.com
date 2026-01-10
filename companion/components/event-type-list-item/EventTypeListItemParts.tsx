import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Tooltip } from "@/components/Tooltip";
import type { EventType } from "@/services/types/event-types.types";

interface EventTypeTitleProps {
  title: string;
  username?: string;
  slug: string;
}

export function EventTypeTitle({ title, username, slug }: EventTypeTitleProps) {
  const linkText = username ? `/${username}/${slug}` : `/${slug}`;
  return (
    <View className="mb-1 flex-row flex-wrap items-baseline">
      <Text className="text-base font-semibold text-cal-text">{title}</Text>
      <Text className="ml-1 text-sm text-cal-text-secondary">{linkText}</Text>
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

interface EventTypeLinkProps {
  username?: string;
  slug: string;
}

export function EventTypeLink({ username, slug }: EventTypeLinkProps) {
  const linkText = username ? `/${username}/${slug}` : `/${slug}`;
  return <Text className="mb-1 mt-0.5 text-sm text-cal-text-secondary">{linkText}</Text>;
}

interface EventTypeBadgesProps {
  formattedDuration: string;
  hidden?: boolean;
  seats?: {
    disabled?: boolean;
    seatsPerTimeSlot?: number;
    showAttendeeInfo?: boolean;
    showAvailabilityCount?: boolean;
  };
  hasPrice: boolean;
  formattedPrice: string | null;
  confirmationPolicy?: EventType["confirmationPolicy"];
  recurrence?: {
    disabled?: boolean;
    interval?: number;
    occurrences?: number;
    frequency?: string;
  } | null;
}

export function EventTypeBadges({
  formattedDuration,
  hidden,
  seats,
  hasPrice,
  formattedPrice,
  confirmationPolicy,
  recurrence,
}: EventTypeBadgesProps) {
  const hasSeats = seats && !seats.disabled && seats.seatsPerTimeSlot && seats.seatsPerTimeSlot > 0;

  const requiresConfirmation =
    confirmationPolicy &&
    !("disabled" in confirmationPolicy && confirmationPolicy.disabled) &&
    "type" in confirmationPolicy &&
    confirmationPolicy.type === "always";

  const hasRecurrence = recurrence && !recurrence.disabled && recurrence.occurrences;

  // Render nothing if we seemingly have no badges (Duration is usually always present though)
  // But checking just in case
  if (
    !formattedDuration &&
    !hidden &&
    !hasSeats &&
    (!hasPrice || !formattedPrice) &&
    !hasRecurrence &&
    !requiresConfirmation
  ) {
    return null;
  }

  return (
    <View className="mt-2 flex-row flex-wrap items-center gap-2" style={{ width: "100%" }}>
      {/* Duration Badge */}
      <View
        className="rounded-md border border-cal-border bg-cal-border"
        style={{ height: 24, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}
      >
        <Ionicons name="time-outline" size={14} color="#000000" />
        <Text className="ml-1.5 text-xs font-semibold text-cal-brand-black">
          {formattedDuration}
        </Text>
      </View>

      {/* Hidden Badge */}
      {hidden ? (
        <View
          className="rounded-md border border-cal-border bg-cal-border"
          style={{ height: 24, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="eye-off-outline" size={14} color="#000000" />
          <Text className="ml-1.5 text-xs font-medium text-cal-brand-black">Hidden</Text>
        </View>
      ) : null}

      {/* Seats Badge */}
      {hasSeats ? (
        <View
          className="rounded-md border border-cal-border bg-cal-border"
          style={{ height: 24, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="people-outline" size={14} color="#000000" />
          <Text className="ml-1.5 text-xs font-medium text-cal-brand-black">
            {seats.seatsPerTimeSlot} seats
          </Text>
        </View>
      ) : null}

      {/* Price Badge */}
      {hasPrice && formattedPrice ? (
        <View
          className="rounded-md border border-cal-border bg-cal-border"
          style={{ height: 24, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="card-outline" size={14} color="#000000" />
          <Text className="ml-1.5 text-xs font-semibold text-cal-brand-black">
            {formattedPrice}
          </Text>
        </View>
      ) : null}

      {/* Repeats Badge */}
      {hasRecurrence ? (
        <View
          className="rounded-md border border-cal-border bg-cal-border"
          style={{ height: 24, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="repeat-outline" size={14} color="#000000" />
          <Text className="ml-1.5 text-xs font-medium text-cal-brand-black">
            {recurrence.occurrences} times
          </Text>
        </View>
      ) : null}

      {/* Requires Confirmation Badge */}
      {requiresConfirmation ? (
        <View
          className="rounded-md border border-cal-border bg-cal-border"
          style={{ height: 24, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="checkmark-circle-outline" size={14} color="#000000" />
          <Text className="ml-1.5 text-xs font-medium text-cal-brand-black">
            Requires confirmation
          </Text>
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
