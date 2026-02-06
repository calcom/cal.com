import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import type { Schedule } from "@/hooks";

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const min = minutes || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
};

interface ScheduleNameProps {
  name: string;
  isDefault?: boolean;
}

export function ScheduleName({ name, isDefault }: ScheduleNameProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="mb-1 flex-row flex-wrap items-center">
      <Text style={{ color: isDark ? "#FFFFFF" : "#333333" }} className="text-base font-semibold">
        {name}
      </Text>
      {isDefault && (
        <View
          className="ml-2 rounded px-2 py-0.5"
          style={{ backgroundColor: isDark ? "#A3A3A3" : "#666666" }}
        >
          <Text className="text-xs font-semibold text-white">Default</Text>
        </View>
      )}
    </View>
  );
}

interface AvailabilitySlotsProps {
  availability?: Schedule["availability"];
  scheduleId: number;
}

export function AvailabilitySlots({ availability, scheduleId }: AvailabilitySlotsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#A3A3A3" : "#666666";

  if (!availability || availability.length === 0) {
    return (
      <Text style={{ color: textColor }} className="text-sm">
        No availability set
      </Text>
    );
  }

  const MAX_VISIBLE_SLOTS = 2;
  const visibleSlots = availability.slice(0, MAX_VISIBLE_SLOTS);
  const remainingCount = availability.length - MAX_VISIBLE_SLOTS;

  return (
    <View>
      {visibleSlots.map((slot, slotIndex) => (
        <View
          key={`${scheduleId}-${slot.days.join("-")}-${slotIndex}`}
          className={slotIndex > 0 ? "mt-1" : ""}
        >
          <Text style={{ color: textColor }} className="text-sm" numberOfLines={1}>
            {slot.days.join(", ")} {formatTime12Hour(slot.startTime)} -{" "}
            {formatTime12Hour(slot.endTime)}
          </Text>
        </View>
      ))}
      {remainingCount > 0 && (
        <Text style={{ color: textColor }} className="mt-1 text-sm">
          +{remainingCount} more {remainingCount === 1 ? "slot" : "slots"}
        </Text>
      )}
    </View>
  );
}

interface TimeZoneRowProps {
  timeZone: string;
}

export function TimeZoneRow({ timeZone }: TimeZoneRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#A3A3A3" : "#666666";

  return (
    <View className="mt-2 flex-row items-center">
      <Ionicons name="globe-outline" size={14} color={iconColor} />
      <Text style={{ color: iconColor }} className="ml-1.5 text-sm">
        {timeZone}
      </Text>
    </View>
  );
}

interface ScheduleActionsButtonProps {
  schedule: Schedule;
  setSelectedSchedule: (schedule: Schedule) => void;
  setShowActionsModal: (show: boolean) => void;
}

export function ScheduleActionsButton({
  schedule,
  setSelectedSchedule,
  setShowActionsModal,
}: ScheduleActionsButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <TouchableOpacity
      style={{
        width: 32,
        height: 32,
        borderWidth: 1,
        borderColor: isDark ? "#4D4D4D" : "#E5E5EA",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={(e) => {
        e.stopPropagation();
        setSelectedSchedule(schedule);
        setShowActionsModal(true);
      }}
    >
      <Ionicons name="ellipsis-horizontal" size={18} color={isDark ? "#E5E5EA" : "#3C3F44"} />
    </TouchableOpacity>
  );
}
