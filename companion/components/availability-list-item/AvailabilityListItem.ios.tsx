import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { AvailabilityListItemProps } from "./AvailabilityListItem";
import { Host, ContextMenu, Button, Image, HStack } from "@expo/ui/swift-ui";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { buttonStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";

export const AvailabilityListItem = ({
  item: schedule,
  handleSchedulePress,
  onDuplicate,
  onDelete,
  onSetAsDefault,
}: AvailabilityListItemProps) => {
  const scheduleActions: {
    label: string;
    icon: any;
    onPress: () => void;
    role: "default" | "destructive";
  }[] = [
    ...(!schedule.isDefault && onSetAsDefault
      ? [
          {
            label: "Set as Default",
            icon: "star",
            onPress: () => onSetAsDefault(schedule),
            role: "default" as const,
          },
        ]
      : []),
    {
      label: "Duplicate",
      icon: "square.on.square",
      onPress: () => onDuplicate?.(schedule),
      role: "default",
    },
    {
      label: "Delete",
      icon: "trash",
      onPress: () => onDelete?.(schedule),
      role: "destructive",
    },
  ];

  return (
    <View
      className="h-fill border-b border-[#E5E5EA]"
      style={{ paddingLeft: 16, paddingVertical: 16 }}
    >
      <View className="flex-row items-center justify-between ">
        <Pressable onPress={() => handleSchedulePress(schedule)} className="flex-grow">
          <View className="mr-4 flex-1">
            <View className="mb-1 flex-row flex-wrap items-center">
              <Text className="text-base font-semibold text-[#333]">{schedule.name}</Text>
              {schedule.isDefault && (
                <View className="ml-2 rounded bg-[#666] px-2 py-0.5">
                  <Text className="text-xs font-semibold text-white">Default</Text>
                </View>
              )}
            </View>

            {schedule.availability && schedule.availability.length > 0 ? (
              <View>
                {schedule.availability.map((slot, slotIndex) => (
                  <View
                    key={`${schedule.id}-${slot.days.join("-")}-${slotIndex}`}
                    className={slotIndex > 0 ? "mt-2" : ""}
                  >
                    <Text className="text-sm text-[#666]">
                      {slot.days.join(", ")} {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-[#666]">No availability set</Text>
            )}

            <View className="mt-2 flex-row items-center">
              <Ionicons name="globe-outline" size={14} color="#666" />
              <Text className="ml-1.5 text-sm text-[#666]">{schedule.timeZone}</Text>
            </View>
          </View>
        </Pressable>

        {/* Three dots button - vertically centered on the right */}
        <Host matchContents>
          <ContextMenu
            modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"), padding()]}
            activationMethod="singlePress"
          >
            <ContextMenu.Items>
              {scheduleActions.map((scheduleAction) => (
                <Button
                  key={scheduleAction.label}
                  systemImage={scheduleAction.icon}
                  onPress={scheduleAction.onPress}
                  role={scheduleAction.role}
                  label={scheduleAction.label}
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
