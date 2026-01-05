import { TouchableOpacity, View } from "react-native";
import {
  EventTypeActions,
  EventTypeBadges,
  EventTypeDescription,
  EventTypeTitle,
} from "./EventTypeListItemParts";
import type { EventTypeListItemProps } from "./types";
import { useEventTypeListItemData } from "./useEventTypeListItemData";

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
  const { formattedDuration, normalizedDescription, hasPrice, formattedPrice } =
    useEventTypeListItemData(item);
  const isLast = index === filteredEventTypes.length - 1;

  return (
    <TouchableOpacity
      className={`bg-cal-bg active:bg-cal-bg-secondary ${!isLast ? "border-b border-cal-border" : ""}`}
      onPress={() => handleEventTypePress(item)}
      onLongPress={() => handleEventTypeLongPress(item)}
      style={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <View style={{ flex: 1, marginRight: 12 }}>
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
        </View>
        <EventTypeActions
          item={item}
          copiedEventTypeId={copiedEventTypeId}
          handleCopyLink={handleCopyLink}
          handlePreview={handlePreview}
          handleEventTypeLongPress={handleEventTypeLongPress}
        />
      </View>
    </TouchableOpacity>
  );
};
