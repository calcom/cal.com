import { TouchableOpacity, View } from "react-native";
import type { Schedule } from "@/hooks";
import {
  AvailabilitySlots,
  ScheduleActionsButton,
  ScheduleName,
  TimeZoneRow,
} from "./AvailabilityListItemParts";

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
      className="border-b border-cal-border bg-cal-bg active:bg-cal-bg-secondary"
      onPress={() => handleSchedulePress(schedule)}
      onLongPress={() => handleScheduleLongPress(schedule)}
      style={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="mr-4 flex-1">
          <ScheduleName name={schedule.name} isDefault={schedule.isDefault} />
          <AvailabilitySlots availability={schedule.availability} scheduleId={schedule.id} />
          <TimeZoneRow timeZone={schedule.timeZone} />
        </View>
        <ScheduleActionsButton
          schedule={schedule}
          setSelectedSchedule={setSelectedSchedule}
          setShowActionsModal={setShowActionsModal}
        />
      </View>
    </TouchableOpacity>
  );
};
