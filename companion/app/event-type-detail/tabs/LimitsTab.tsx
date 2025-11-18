import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { bufferTimeOptions, timeUnitOptions, frequencyUnitOptions, durationUnitOptions, slotIntervalOptions } from "../constants";

interface FrequencyLimit {
  id: number;
  value: string;
  unit: string;
}

interface DurationLimit {
  id: number;
  value: string;
  unit: string;
}

interface LimitsTabProps {
  // Buffer times
  beforeEventBuffer: string;
  setShowBeforeBufferDropdown: (show: boolean) => void;
  afterEventBuffer: string;
  setShowAfterBufferDropdown: (show: boolean) => void;
  
  // Minimum notice
  minimumNoticeValue: string;
  setMinimumNoticeValue: (value: string) => void;
  minimumNoticeUnit: string;
  setShowMinimumNoticeUnitDropdown: (show: boolean) => void;
  
  // Slot interval
  slotInterval: string;
  setShowSlotIntervalDropdown: (show: boolean) => void;
  
  // Booking frequency
  limitBookingFrequency: boolean;
  toggleBookingFrequency: (value: boolean) => void;
  frequencyAnimationValue: Animated.Value;
  frequencyLimits: FrequencyLimit[];
  updateFrequencyLimit: (id: number, field: string, value: string) => void;
  setShowFrequencyUnitDropdown: (id: number) => void;
  removeFrequencyLimit: (id: number) => void;
  addFrequencyLimit: () => void;
  
  // Total duration
  limitTotalDuration: boolean;
  toggleTotalDuration: (value: boolean) => void;
  durationAnimationValue: Animated.Value;
  durationLimits: DurationLimit[];
  updateDurationLimit: (id: number, field: string, value: string) => void;
  setShowDurationUnitDropdown: (id: number) => void;
  removeDurationLimit: (id: number) => void;
  addDurationLimit: () => void;
  
  // Only show first slot
  onlyShowFirstAvailableSlot: boolean;
  setOnlyShowFirstAvailableSlot: (value: boolean) => void;
  
  // Max active bookings
  maxActiveBookingsPerBooker: boolean;
  setMaxActiveBookingsPerBooker: (value: boolean) => void;
  maxActiveBookingsValue: string;
  setMaxActiveBookingsValue: (value: string) => void;
  
  // Future bookings
  limitFutureBookings: boolean;
  setLimitFutureBookings: (value: boolean) => void;
  futureBookingType: "rolling" | "range";
  setFutureBookingType: (type: "rolling" | "range") => void;
  rollingDays: string;
  setRollingDays: (value: string) => void;
  rollingCalendarDays: boolean;
  setRollingCalendarDays: (value: boolean) => void;
  rangeStartDate: string;
  setRangeStartDate: (value: string) => void;
  rangeEndDate: string;
  setRangeEndDate: (value: string) => void;
}

export default function LimitsTab(props: LimitsTabProps) {
  return (
    <View className="gap-3">
      {/* Buffer Time, Minimum Notice, and Slot Interval Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="mb-3">
          <Text className="text-base font-semibold text-[#333] mb-1.5">Before event</Text>
          <TouchableOpacity
            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
            onPress={() => props.setShowBeforeBufferDropdown(true)}>
            <Text className="text-base text-black">{props.beforeEventBuffer}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View className="mb-3" style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 12, marginTop: 12 }}>
          <Text className="text-base font-semibold text-[#333] mb-1.5">After event</Text>
          <TouchableOpacity
            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
            onPress={() => props.setShowAfterBufferDropdown(true)}>
            <Text className="text-base text-black">{props.afterEventBuffer}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View className="mb-3" style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 12, marginTop: 12 }}>
          <Text className="text-base font-semibold text-[#333] mb-1.5">Minimum Notice</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
              value={props.minimumNoticeValue}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, "");
                const num = parseInt(numericValue) || 0;
                if (num >= 0) {
                  props.setMinimumNoticeValue(numericValue || "0");
                }
              }}
              placeholder="1"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
            />
            <TouchableOpacity
              className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
              onPress={() => props.setShowMinimumNoticeUnitDropdown(true)}>
              <Text className="text-base text-black">{props.minimumNoticeUnit}</Text>
              <Ionicons name="chevron-down" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 12, marginTop: 12 }}>
          <Text className="text-base font-semibold text-[#333] mb-1.5">Time-slot intervals</Text>
          <TouchableOpacity
            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
            onPress={() => props.setShowSlotIntervalDropdown(true)}>
            <Text className="text-base text-black">{props.slotInterval === "Default" ? "Use event length (default)" : props.slotInterval}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Booking Frequency Limit Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-4">
            <Text className="text-base text-[#333] font-medium mb-1">Limit booking frequency</Text>
            <Text className="text-sm text-[#666] leading-5">
              Limit how many times this event can be booked.
            </Text>
          </View>
          <Switch
            value={props.limitBookingFrequency}
            onValueChange={props.toggleBookingFrequency}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Animated.View
          style={[
            { overflow: "hidden" },
            {
              opacity: props.frequencyAnimationValue,
              maxHeight: props.frequencyAnimationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
              }),
            },
          ]}>
          {props.limitBookingFrequency && (
            <>
              {props.frequencyLimits.map((limit, index) => (
                <View key={limit.id} className="flex-row items-center mt-4 gap-3">
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                    value={limit.value}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      const num = parseInt(numericValue) || 0;
                      if (num >= 0) {
                        props.updateFrequencyLimit(limit.id, "value", numericValue || "0");
                      }
                    }}
                    placeholder="1"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                    onPress={() => props.setShowFrequencyUnitDropdown(limit.id)}>
                    <Text className="text-base text-black">{limit.unit}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                  {props.frequencyLimits.length > 1 && (
                    <TouchableOpacity
                      className="w-10 h-10 justify-center items-center bg-[#FFF1F0] rounded-lg border border-[#FFCCC7]"
                      onPress={() => props.removeFrequencyLimit(limit.id)}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                className="flex-row items-center justify-center mt-4 py-3 px-4 bg-transparent border border-black rounded-lg gap-2"
                onPress={props.addFrequencyLimit}>
                <Ionicons name="add" size={20} color="#000" />
                <Text className="text-base text-black font-medium">Add Limit</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>

      {/* Total Booking Duration Limit Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-4">
            <Text className="text-base text-[#333] font-medium mb-1">Limit total booking duration</Text>
            <Text className="text-sm text-[#666] leading-5">
              Limit total amount of time that this event can be booked.
            </Text>
          </View>
          <Switch
            value={props.limitTotalDuration}
            onValueChange={props.toggleTotalDuration}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Animated.View
          style={[
            { overflow: "hidden" },
            {
              opacity: props.durationAnimationValue,
              maxHeight: props.durationAnimationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
              }),
            },
          ]}>
          {props.limitTotalDuration && (
            <>
              {props.durationLimits.map((limit, index) => (
                <View key={limit.id} className="flex-row items-center mt-4 gap-3">
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                      value={limit.value}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9]/g, "");
                        const num = parseInt(numericValue) || 0;
                        if (num >= 0) {
                          props.updateDurationLimit(limit.id, "value", numericValue || "0");
                        }
                      }}
                      placeholder="60"
                      placeholderTextColor="#8E8E93"
                      keyboardType="numeric"
                    />
                    <Text className="text-base text-[#666]">Minutes</Text>
                  </View>
                  <TouchableOpacity
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center min-w-[100px]"
                    onPress={() => props.setShowDurationUnitDropdown(limit.id)}>
                    <Text className="text-base text-black">{limit.unit}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                  {props.durationLimits.length > 1 && (
                    <TouchableOpacity
                      className="w-10 h-10 justify-center items-center bg-[#FFF1F0] rounded-lg border border-[#FFCCC7]"
                      onPress={() => props.removeDurationLimit(limit.id)}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                className="flex-row items-center justify-center mt-4 py-3 px-4 bg-transparent border border-black rounded-lg gap-2"
                onPress={props.addDurationLimit}>
                <Ionicons name="add" size={20} color="#000" />
                <Text className="text-base text-black font-medium">Add Limit</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>

      {/* Only Show First Available Slot Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-4">
            <Text className="text-base text-[#333] font-medium mb-1">Only show the first slot of each day as available</Text>
            <Text className="text-sm text-[#666] leading-5">
              This will limit your availability for this event type to one slot per day, scheduled at the earliest available time.
            </Text>
          </View>
          <Switch
            value={props.onlyShowFirstAvailableSlot}
            onValueChange={props.setOnlyShowFirstAvailableSlot}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Max Active Bookings Per Booker Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-base text-[#333] font-medium mb-1">Limit number of upcoming bookings per booker</Text>
            <Text className="text-sm text-[#666] leading-5">
              Limit the number of active bookings a booker can make for this event type.
            </Text>
          </View>
          <Switch
            value={props.maxActiveBookingsPerBooker}
            onValueChange={props.setMaxActiveBookingsPerBooker}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
        {props.maxActiveBookingsPerBooker && (
          <View className="mt-3">
            <TextInput
              className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
              value={props.maxActiveBookingsValue}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, "");
                const num = parseInt(numericValue) || 0;
                if (num >= 0) {
                  props.setMaxActiveBookingsValue(numericValue || "1");
                }
              }}
              placeholder="1"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
            />
          </View>
        )}
      </View>

      {/* Limit Future Bookings Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-base text-[#333] font-medium mb-1">Limit future bookings</Text>
            <Text className="text-sm text-[#666] leading-5">
              Limit how far in the future this event can be booked.
            </Text>
          </View>
          <Switch
            value={props.limitFutureBookings}
            onValueChange={props.setLimitFutureBookings}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
        {props.limitFutureBookings && (
          <View className="mt-3 gap-3">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className={`flex-1 border rounded-lg px-3 py-3 flex-row items-center justify-center ${
                  props.futureBookingType === "rolling"
                    ? "bg-[#F0F0F0] border-[#333]"
                    : "bg-[#F8F9FA] border-[#E5E5EA]"
                }`}
                onPress={() => props.setFutureBookingType("rolling")}>
                <Text
                  className={`text-base ${
                    props.futureBookingType === "rolling" ? "text-[#333] font-semibold" : "text-[#666]"
                  }`}>
                  Rolling
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 border rounded-lg px-3 py-3 flex-row items-center justify-center ${
                  props.futureBookingType === "range"
                    ? "bg-[#F0F0F0] border-[#333]"
                    : "bg-[#F8F9FA] border-[#E5E5EA]"
                }`}
                onPress={() => props.setFutureBookingType("range")}>
                <Text
                  className={`text-base ${
                    props.futureBookingType === "range" ? "text-[#333] font-semibold" : "text-[#666]"
                  }`}>
                  Date Range
                </Text>
              </TouchableOpacity>
            </View>
            {props.futureBookingType === "rolling" && (
              <View className="gap-3">
                <View className="flex-row items-center gap-3">
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black flex-1"
                    value={props.rollingDays}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      const num = parseInt(numericValue) || 0;
                      if (num >= 0) {
                        props.setRollingDays(numericValue || "30");
                      }
                    }}
                    placeholder="30"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    className={`flex-1 border rounded-lg px-3 py-3 flex-row items-center justify-center ${
                      props.rollingCalendarDays
                        ? "bg-[#F0F0F0] border-[#333]"
                        : "bg-[#F8F9FA] border-[#E5E5EA]"
                    }`}
                    onPress={() => props.setRollingCalendarDays(!props.rollingCalendarDays)}>
                    <Text
                      className={`text-base ${
                        props.rollingCalendarDays ? "text-[#333] font-semibold" : "text-[#666]"
                      }`}>
                      {props.rollingCalendarDays ? "Calendar days" : "Business days"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-sm text-[#666]">days into the future</Text>
              </View>
            )}
            {props.futureBookingType === "range" && (
              <View className="gap-3">
                <View>
                  <Text className="text-sm text-[#666] mb-1.5">Start date</Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                    value={props.rangeStartDate}
                    onChangeText={props.setRangeStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
                <View>
                  <Text className="text-sm text-[#666] mb-1.5">End date</Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                    value={props.rangeEndDate}
                    onChangeText={props.setRangeEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
