import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type React from "react";
import { Pressable, View } from "react-native";
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

  type ButtonSystemImage = React.ComponentProps<typeof Button>["systemImage"];
  type EventTypeIcon = Exclude<ButtonSystemImage, undefined>;

  const eventTypes: {
    label: string;
    icon: EventTypeIcon;
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

  return (
    <View
      className={`bg-cal-bg active:bg-cal-bg-secondary ${!isLast ? "border-b border-cal-border" : ""}`}
    >
      {/* Native iOS Context Menu for long-press */}
      <Host matchContents>
        <ContextMenu
          modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
          activationMethod="longPress"
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
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => handleEventTypePress(item)}
                style={{
                  paddingTop: 16,
                  paddingBottom: 22,
                  paddingLeft: 16,
                  flex: 1,
                  marginRight: 12,
                }}
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

              <View style={{ paddingRight: 16, flexShrink: 0 }}>
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
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </View>
  );
};
