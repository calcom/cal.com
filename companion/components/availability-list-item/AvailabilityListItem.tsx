import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { Schedule } from "../../hooks";

export interface AvailabilityListItemProps {
  item: Schedule;
  index: number;
  handleSchedulePress: (schedule: Schedule) => void;
  handleScheduleLongPress: (schedule: Schedule) => void;
  setSelectedSchedule: (schedule: Schedule) => void;
  setShowActionsModal: (show: boolean) => void;
  onDuplicate?: (schedule: Schedule) => void;
  onDelete?: (schedule: Schedule) => void;
  onSetAsDefault?: (schedule: Schedule) => void;
}

export const AvailabilityListItem = ({
  item: schedule,
  handleSchedulePress,
  handleScheduleLongPress,
  setSelectedSchedule,
  setShowActionsModal,
}: AvailabilityListItemProps) => {
  return (
    <TouchableOpacity
      className="border-b border-[#E5E5EA] bg-white active:bg-[#F8F9FA] "
      onPress={() => handleSchedulePress(schedule)}
      onLongPress={() => handleScheduleLongPress(schedule)}
      style={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      <View className="flex-row items-center justify-between">
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

        {/* Three dots button - vertically centered on the right */}
        <TouchableOpacity
          className="items-center justify-center rounded-lg border border-[#E5E5EA]"
          style={{ width: 32, height: 32 }}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedSchedule(schedule);
            setShowActionsModal(true);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
