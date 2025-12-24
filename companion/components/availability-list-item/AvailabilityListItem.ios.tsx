import type { AvailabilityListItemProps } from "./AvailabilityListItem";
import { Host, ContextMenu, Button, Image, HStack } from "@expo/ui/swift-ui";
import { buttonStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, Text, View } from "react-native";

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
      className="border-b border-[#E5E5EA] bg-white"
      style={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      <View className="flex-row items-center">
        <Pressable
          onPress={() => handleSchedulePress(schedule)}
          className="mr-4 flex-1"
          accessibilityRole="button"
        >
          <View>
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

        {/* Three dots menu - fixed hit target so it doesn't get squeezed off-screen */}
        <View
          className="items-center justify-center rounded-lg border border-[#E5E5EA]"
          style={{ width: 32, height: 32 }}
        >
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
    </View>
  );
};
