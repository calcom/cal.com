/**
 * AvailabilityTab Component
 *
 * Displays schedule selection and weekly availability in iOS Settings style.
 * Matches the beautiful styling from AvailabilityDetailScreen.
 */

import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import type { Schedule } from "@/services/calcom";
import { AvailabilityTabIOSPicker } from "./AvailabilityTabIOSPicker";

interface TimeSlot {
  startTime?: string;
  endTime?: string;
}

interface DaySchedule {
  day: string;
  available: boolean;
  startTime?: string;
  endTime?: string;
  timeSlots?: TimeSlot[];
}

interface AvailabilityTabProps {
  selectedSchedule: Schedule | null;
  setShowScheduleDropdown: (show: boolean) => void;
  schedulesLoading: boolean;
  scheduleDetailsLoading: boolean;
  selectedScheduleDetails: Schedule | null;
  getDaySchedules: () => DaySchedule[];
  formatTime: (time: string) => string;
  selectedTimezone: string;
  schedules: Schedule[];
  setSelectedSchedule: (schedule: Schedule) => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const min = minutes || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
};

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="mb-2 ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72] dark:text-[#A3A3A3]"
      style={{ letterSpacing: 0.5 }}
    >
      {title}
    </Text>
  );
}

// Settings group container
function SettingsGroup({ children, header }: { children: React.ReactNode; header?: string }) {
  return (
    <View>
      {header ? <SectionHeader title={header} /> : null}
      <View className="overflow-hidden rounded-[14px] bg-white dark:bg-[#171717]">{children}</View>
    </View>
  );
}

// Navigation row
function NavigationRow({
  title,
  value,
  onPress,
  isLast = false,
  disabled = false,
  options,
  onSelect,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  disabled?: boolean;
  options?: { label: string; value: string }[];
  onSelect?: (value: string) => void;
}) {
  return (
    <View className="bg-white pl-4 dark:bg-[#171717]" style={{ height: 44 }}>
      <View
        className={`flex-1 flex-row items-center justify-between pr-4 ${
          !isLast ? "border-b border-[#E5E5E5] dark:border-[#4D4D4D]" : ""
        }`}
        style={{ height: 44 }}
      >
        <Text className="text-[17px] text-black dark:text-white" style={{ fontWeight: "400" }}>
          {title}
        </Text>
        <View className="flex-row items-center">
          {Platform.OS === "ios" && options && onSelect ? (
            <>
              {value ? (
                <Text className="mr-2 text-[17px] text-[#A3A3A3]" numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <AvailabilityTabIOSPicker
                options={options}
                selectedValue={value || ""}
                onSelect={onSelect}
              />
            </>
          ) : (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={onPress}
              activeOpacity={0.5}
              disabled={disabled}
            >
              {value ? (
                <Text className="mr-1 text-[17px] text-[#A3A3A3]" numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export function AvailabilityTab(props: AvailabilityTabProps) {
  const daySchedules = props.getDaySchedules();
  const enabledDaysCount = daySchedules.filter((d) => d.available).length;

  return (
    <View className="gap-6">
      {/* Schedule Selector */}
      <SettingsGroup header="Schedule">
        <NavigationRow
          title="Schedule"
          value={
            props.schedulesLoading
              ? "Loading..."
              : props.selectedSchedule?.name || "Select schedule"
          }
          onPress={() => props.setShowScheduleDropdown(true)}
          disabled={props.schedulesLoading}
          options={props.schedules.map((s) => ({ label: s.name, value: s.id.toString() }))}
          onSelect={(id) => {
            const schedule = props.schedules.find((s) => s.id.toString() === id);
            if (schedule) props.setSelectedSchedule(schedule);
          }}
          isLast
        />
      </SettingsGroup>

      {/* Weekly Schedule */}
      {props.selectedSchedule ? (
        <SettingsGroup>
          {/* Header row */}
          <View className="bg-white pl-4 dark:bg-[#171717]">
            <View
              className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4 dark:border-[#4D4D4D]"
              style={{ height: 44 }}
            >
              <Text className="text-[17px] text-black dark:text-white">Weekly Schedule</Text>
              <Text className="text-[17px] text-[#A3A3A3]">
                {enabledDaysCount} {enabledDaysCount === 1 ? "day" : "days"}
              </Text>
            </View>
          </View>

          {/* Day rows */}
          {props.scheduleDetailsLoading ? (
            <View className="items-center bg-white py-6 dark:bg-[#171717]">
              <Text className="text-[15px] italic text-[#A3A3A3]">Loading schedule details...</Text>
            </View>
          ) : props.selectedScheduleDetails ? (
            <View className="bg-white px-4 py-2 dark:bg-[#171717]">
              {DAYS.map((day, index) => {
                const dayInfo = daySchedules.find((d) => d.day === day);
                const isEnabled = dayInfo?.available ?? false;
                const isLast = index === DAYS.length - 1;
                const timeSlots = dayInfo?.timeSlots || [];

                return (
                  <View
                    key={day}
                    className={`flex-row items-center py-3 ${!isLast ? "border-b border-[#E5E5E5] dark:border-[#4D4D4D]" : ""}`}
                  >
                    {/* Availability indicator */}
                    <View
                      className={`mr-3 h-2.5 w-2.5 rounded-full ${
                        isEnabled ? "bg-[#34C759]" : "bg-[#E5E5EA] dark:bg-[#404040]"
                      }`}
                    />

                    {/* Day name */}
                    <Text
                      className={`w-24 text-[15px] font-medium ${
                        isEnabled ? "text-black dark:text-white" : "text-[#A3A3A3]"
                      }`}
                    >
                      {day}
                    </Text>

                    {/* Time ranges or Unavailable - support multiple time slots */}
                    {isEnabled && timeSlots.length > 0 ? (
                      <View className="flex-1 items-end">
                        {timeSlots.map((slot, slotIndex) => (
                          <Text
                            key={`${slotIndex}-${slot.startTime}`}
                            className={`text-[15px] text-black dark:text-white ${slotIndex > 0 ? "mt-1" : ""}`}
                          >
                            {slot.startTime && slot.endTime
                              ? `${formatTime12Hour(slot.startTime)} - ${formatTime12Hour(slot.endTime)}`
                              : ""}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text className="flex-1 text-right text-[15px] text-[#A3A3A3]">
                        Unavailable
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="items-center bg-white py-6 dark:bg-[#171717]">
              <Text className="text-[15px] italic text-[#A3A3A3]">
                Failed to load schedule details
              </Text>
            </View>
          )}
        </SettingsGroup>
      ) : null}

      {/* Timezone */}
      {props.selectedSchedule ? (
        <SettingsGroup header="Timezone">
          <View className="bg-white px-4 py-3 dark:bg-[#171717]">
            <Text className="text-center text-[17px] text-[#666] dark:text-[#A3A3A3]">
              {props.selectedTimezone || props.selectedScheduleDetails?.timeZone || "No timezone"}
            </Text>
          </View>
        </SettingsGroup>
      ) : null}
    </View>
  );
}
