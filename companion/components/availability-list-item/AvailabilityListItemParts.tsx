import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import type { Schedule } from "@/hooks";

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

  return (
    <View>
      {availability.map((slot, slotIndex) => (
        <View
          key={`${scheduleId}-${slot.days.join("-")}-${slotIndex}`}
          className={slotIndex > 0 ? "mt-2" : ""}
        >
          <Text className="text-sm text-cal-text-secondary">
            {slot.days.join(", ")} {slot.startTime} - {slot.endTime}
          </Text>
        </View>
      ))}
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
