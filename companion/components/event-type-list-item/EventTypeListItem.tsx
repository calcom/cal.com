import { Ionicons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Pressable, useColorScheme, View } from "react-native";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const colors = {
    icon: isDark ? "#FFFFFF" : "#3C3F44",
    iconMenu: isDark ? "#E5E5EA" : "#374151",
  };

  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
        borderBottomWidth: !isLast ? 1 : 0,
        borderBottomColor: isDark ? "#4D4D4D" : "#E5E5EA",
      }}
    >
      <View
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}
        className="flex-row items-center justify-between"
      >
        <Pressable
          onPress={() => handleEventTypePress(item)}
          style={{ flex: 1, marginRight: 12 }}
          android_ripple={{ color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Pressable
              className="items-center justify-center rounded-lg border border-cal-border bg-white dark:border-cal-border-dark dark:bg-[#171717]"
              style={{ width: 36, height: 36, flexShrink: 0 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.icon} />
            </Pressable>
          </DropdownMenuTrigger>

          <DropdownMenuContent insets={contentInsets} sideOffset={8} className="w-44" align="end">
            <DropdownMenuItem onPress={() => handlePreview(item)}>
              <Ionicons
                name="open-outline"
                size={18}
                color={colors.iconMenu}
                style={{ marginRight: 8 }}
              />
              <Text>Preview</Text>
            </DropdownMenuItem>

            <DropdownMenuItem onPress={() => handleCopyLink(item)}>
              <Ionicons
                name="link-outline"
                size={18}
                color={colors.iconMenu}
                style={{ marginRight: 8 }}
              />
              <Text>Copy link</Text>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onPress={() => onEdit?.(item)}>
              <Ionicons
                name="pencil-outline"
                size={18}
                color={colors.iconMenu}
                style={{ marginRight: 8 }}
              />
              <Text>Edit</Text>
            </DropdownMenuItem>

            <DropdownMenuItem onPress={() => onDuplicate?.(item)}>
              <Ionicons
                name="copy-outline"
                size={18}
                color={colors.iconMenu}
                style={{ marginRight: 8 }}
              />
              <Text>Duplicate</Text>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onPress={() => onDelete?.(item)}>
              <Ionicons
                name="trash-outline"
                size={18}
                color={theme.destructive}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: theme.destructive }}>Delete</Text>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </View>
    </View>
  );
};
