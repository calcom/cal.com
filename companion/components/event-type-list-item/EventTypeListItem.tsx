import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Text } from "@/components/ui/text";
import { EventTypeBadges, EventTypeDescription, EventTypeTitle } from "./EventTypeListItemParts";
import type { EventTypeListItemProps } from "./types";
import { useEventTypeListItemData } from "./useEventTypeListItemData";

export const EventTypeListItem = ({
  item,
  index,
  filteredEventTypes,
  handleEventTypePress,
  handleCopyLink,
  handlePreview,
  onEdit,
  onDuplicate,
  onDelete,
}: EventTypeListItemProps) => {
  const { formattedDuration, normalizedDescription, hasPrice, formattedPrice } =
    useEventTypeListItemData(item);
  const isLast = index === filteredEventTypes.length - 1;
  const insets = useSafeAreaInsets();

  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  return (
    <View className={`bg-cal-bg ${!isLast ? "border-b border-cal-border" : ""}`}>
      <View
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}
        className="flex-row items-center justify-between"
      >
        <Pressable
          onPress={() => handleEventTypePress(item)}
          style={{ flex: 1, marginRight: 12 }}
          android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
        >
          <EventTypeTitle
            title={item.title}
            username={item.users?.[0]?.username}
            slug={item.slug}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Pressable
              className="items-center justify-center rounded-lg border border-cal-border"
              style={{ width: 36, height: 36, flexShrink: 0 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
            </Pressable>
          </DropdownMenuTrigger>

          <DropdownMenuContent insets={contentInsets} sideOffset={8} className="w-44" align="end">
            <DropdownMenuItem onPress={() => handlePreview(item)}>
              <Ionicons name="open-outline" size={18} color="#374151" style={{ marginRight: 8 }} />
              <Text>Preview</Text>
            </DropdownMenuItem>

            <DropdownMenuItem onPress={() => handleCopyLink(item)}>
              <Ionicons name="link-outline" size={18} color="#374151" style={{ marginRight: 8 }} />
              <Text>Copy link</Text>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onPress={() => onEdit?.(item)}>
              <Ionicons
                name="pencil-outline"
                size={18}
                color="#374151"
                style={{ marginRight: 8 }}
              />
              <Text>Edit</Text>
            </DropdownMenuItem>

            <DropdownMenuItem onPress={() => onDuplicate?.(item)}>
              <Ionicons name="copy-outline" size={18} color="#374151" style={{ marginRight: 8 }} />
              <Text>Duplicate</Text>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onPress={() => onDelete?.(item)}>
              <Ionicons name="trash-outline" size={18} color="#800020" style={{ marginRight: 8 }} />
              <Text className="text-destructive">Delete</Text>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </View>
    </View>
  );
};
