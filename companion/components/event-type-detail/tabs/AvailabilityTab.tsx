import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Schedule } from "../../../services/calcom";

interface DaySchedule {
  day: string;
  available: boolean;
  startTime?: string;
  endTime?: string;
}

interface AvailabilityTabProps {
  selectedSchedule: Schedule | null;
  setShowScheduleDropdown: (show: boolean) => void;
  schedulesLoading: boolean;
  scheduleDetailsLoading: boolean;
  selectedScheduleDetails: any;
  getDaySchedule: () => DaySchedule[];
  formatTime: (time: string) => string;
  selectedTimezone: string;
}

export function AvailabilityTab(props: AvailabilityTabProps) {
  return (
    <View className="rounded-2xl bg-white p-5">
      <View className="mb-3">
        <Text className="mb-1.5 text-base font-semibold text-[#333]">Availability</Text>
        <TouchableOpacity
          className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
          onPress={() => props.setShowScheduleDropdown(true)}
          disabled={props.schedulesLoading}
        >
          <Text className="text-base text-black">
            {props.schedulesLoading
              ? "Loading schedules..."
              : props.selectedSchedule
                ? props.selectedSchedule.name
                : "Select schedule"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {props.selectedSchedule ? (
        <>
          <View
            className="mt-5 pt-5"
            style={{
              borderTopWidth: 1,
              borderTopColor: "#E5E5EA",
              marginLeft: -20,
              marginRight: -20,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            {props.scheduleDetailsLoading ? (
              <View className="items-center py-4">
                <Text className="text-sm italic text-[#8E8E93]">Loading schedule details...</Text>
              </View>
            ) : props.selectedScheduleDetails ? (
              props.getDaySchedule().map((dayInfo, index) => (
                <View key={index} className="flex-row items-center justify-between py-4">
                  <Text
                    className={`ml-2 flex-1 text-[15px] font-medium text-[#333] ${
                      !dayInfo.available ? "text-[#8E8E93] line-through" : ""
                    }`}
                  >
                    {dayInfo.day}
                  </Text>
                  <Text className="mr-4 text-right text-[15px] text-[#666]">
                    {dayInfo.available && dayInfo.startTime && dayInfo.endTime
                      ? `${props.formatTime(dayInfo.startTime)} - ${props.formatTime(dayInfo.endTime)}`
                      : "Unavailable"}
                  </Text>
                </View>
              ))
            ) : (
              <View className="items-center py-4">
                <Text className="text-sm italic text-[#8E8E93]">
                  Failed to load schedule details
                </Text>
              </View>
            )}
          </View>

          <View
            className="mt-5 pt-5"
            style={{
              borderTopWidth: 1,
              borderTopColor: "#E5E5EA",
              marginLeft: -20,
              marginRight: -20,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            <Text className="mb-1.5 text-base font-semibold text-[#333]">Timezone</Text>
            <View className="items-center rounded-lg bg-[#F8F9FA] px-3 py-3">
              <Text className="text-center text-base text-[#666]">
                {props.selectedTimezone || props.selectedScheduleDetails?.timeZone || "No timezone"}
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
