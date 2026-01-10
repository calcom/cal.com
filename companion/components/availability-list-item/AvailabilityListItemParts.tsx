import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
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
  return (
    <View className="mb-1 flex-row flex-wrap items-center">
      <Text className="text-base font-semibold text-cal-text">{name}</Text>
      {isDefault && (
        <View className="ml-2 rounded bg-cal-text-secondary px-2 py-0.5">
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
  if (!availability || availability.length === 0) {
    return <Text className="text-sm text-cal-text-secondary">No availability set</Text>;
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
          <Text className="text-sm text-cal-text-secondary" numberOfLines={1}>
            {slot.days.join(", ")} {formatTime12Hour(slot.startTime)} -{" "}
            {formatTime12Hour(slot.endTime)}
          </Text>
        </View>
      ))}
      {remainingCount > 0 && (
        <Text className="mt-1 text-sm text-cal-text-secondary">
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
  return (
    <View className="mt-2 flex-row items-center">
      <Ionicons name="globe-outline" size={14} color="#666666" />
      <Text className="ml-1.5 text-sm text-cal-text-secondary">{timeZone}</Text>
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
  return (
    <TouchableOpacity
      className="items-center justify-center rounded-lg border border-cal-border"
      style={{ width: 32, height: 32 }}
      onPress={(e) => {
        e.stopPropagation();
        setSelectedSchedule(schedule);
        setShowActionsModal(true);
      }}
    >
      <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
    </TouchableOpacity>
  );
}
