import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, View } from "react-native";
import type { SFSymbols7_0 } from "sf-symbols-typescript";
import type { AvailabilityListItemProps } from "./AvailabilityListItem";
import { AvailabilitySlots, ScheduleName, TimeZoneRow } from "./AvailabilityListItemParts";

export const AvailabilityListItem = ({
  item: schedule,
  handleSchedulePress,
  onDuplicate,
  onDelete,
  onSetAsDefault,
}: AvailabilityListItemProps) => {
  const scheduleActions: {
    label: string;
    icon: SFSymbols7_0;
    onPress: () => void;
    role: "default" | "destructive";
  }[] = [
    ...(!schedule.isDefault && onSetAsDefault
      ? [
          {
            label: "Set as Default",
            icon: "star" as const,
            onPress: () => onSetAsDefault(schedule),
            role: "default" as const,
          },
        ]
      : []),
    {
      label: "Duplicate",
      icon: "square.on.square" as const,
      onPress: () => onDuplicate?.(schedule),
      role: "default" as const,
    },
    {
      label: "Delete",
      icon: "trash" as const,
      onPress: () => onDelete?.(schedule),
      role: "destructive" as const,
    },
  ];

  return (
    <View className="border-b border-cal-border bg-cal-bg">
      {/* Native iOS Context Menu for long-press */}
      <Host matchContents>
        <ContextMenu
          modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
          activationMethod="longPress"
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
            <View
              className="flex-row items-center"
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
            >
              <Pressable
                onPress={() => handleSchedulePress(schedule)}
                className="mr-4 flex-1"
                accessibilityRole="button"
              >
                <View>
                  <ScheduleName name={schedule.name} isDefault={schedule.isDefault} />
                  <AvailabilitySlots
                    availability={schedule.availability}
                    scheduleId={schedule.id}
                  />
                  <TimeZoneRow timeZone={schedule.timeZone} />
                </View>
              </Pressable>

              {/* Three dots menu - fixed hit target so it doesn't get squeezed off-screen */}
              <View
                className="items-center justify-center rounded-lg border border-cal-border"
                style={{ width: 32, height: 32 }}
              >
                <Host matchContents>
                  <ContextMenu
                    modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
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
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </View>
  );
};
