import { TouchableOpacity, View } from "react-native";
import {
  DurationBadge,
  EventTypeActions,
  EventTypeDescription,
  EventTypeTitle,
  PriceAndConfirmationBadges,
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
        <View className="mr-4 flex-1">
          <EventTypeTitle title={item.title} />
          <EventTypeDescription normalizedDescription={normalizedDescription} />
          <DurationBadge formattedDuration={formattedDuration} />
          <PriceAndConfirmationBadges
            hasPrice={hasPrice}
            formattedPrice={formattedPrice}
            requiresConfirmation={item.requiresConfirmation}
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
