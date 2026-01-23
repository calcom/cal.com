import { Ionicons } from "@expo/vector-icons";
import React from "react";
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
import type { Schedule } from "@/hooks";
import { AvailabilitySlots, ScheduleName, TimeZoneRow } from "./AvailabilityListItemParts";

export interface AvailabilityListItemProps {
  item: Schedule;
  index: number;
  handleSchedulePress: (schedule: Schedule) => void;
  onDuplicate?: (schedule: Schedule) => void;
  onDelete?: (schedule: Schedule) => void;
  onSetAsDefault?: (schedule: Schedule) => void;
}

export const AvailabilityListItem = ({
  item: schedule,
  handleSchedulePress,
  onDuplicate,
  onDelete,
  onSetAsDefault,
}: AvailabilityListItemProps) => {
  const insets = useSafeAreaInsets();

  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  type DropdownAction = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: "default" | "destructive";
  };

  const scheduleActions: DropdownAction[] = [
    ...(!schedule.isDefault && onSetAsDefault
      ? [
          {
            label: "Set as Default",
            icon: "star-outline" as const,
            onPress: () => onSetAsDefault(schedule),
            variant: "default" as const,
          },
        ]
      : []),
    ...(onDuplicate
      ? [
          {
            label: "Duplicate",
            icon: "copy-outline" as const,
            onPress: () => onDuplicate(schedule),
            variant: "default" as const,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: "Delete",
            icon: "trash-outline" as const,
            onPress: () => onDelete(schedule),
            variant: "destructive" as const,
          },
        ]
      : []),
  ];

  const destructiveStartIndex = scheduleActions.findIndex(
    (action) => action.variant === "destructive"
  );

  return (
    <View className="border-b border-cal-border bg-cal-bg">
      <View
        className="flex-row items-center"
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}
      >
        <Pressable
          onPress={() => handleSchedulePress(schedule)}
          className="mr-4 flex-1"
          android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
          style={{ minWidth: 0 }}
        >
          <View style={{ flex: 1 }}>
            <ScheduleName name={schedule.name} isDefault={schedule.isDefault} />
            <AvailabilitySlots availability={schedule.availability} scheduleId={schedule.id} />
            <TimeZoneRow timeZone={schedule.timeZone} />
          </View>
        </Pressable>

        {scheduleActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable
                className="items-center justify-center rounded-lg border border-cal-border"
                style={{ width: 32, height: 32, flexShrink: 0 }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
              </Pressable>
            </DropdownMenuTrigger>

            <DropdownMenuContent insets={contentInsets} sideOffset={8} className="w-44" align="end">
              {scheduleActions.map((action, index) => (
                <React.Fragment key={action.label}>
                  {index === destructiveStartIndex && destructiveStartIndex > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem variant={action.variant} onPress={action.onPress}>
                    <Ionicons
                      name={action.icon}
                      size={18}
                      color={action.variant === "destructive" ? "#800020" : "#374151"}
                      style={{ marginRight: 8 }}
                    />
                    <Text className={action.variant === "destructive" ? "text-destructive" : ""}>
                      {action.label}
                    </Text>
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </View>
    </View>
  );
};
