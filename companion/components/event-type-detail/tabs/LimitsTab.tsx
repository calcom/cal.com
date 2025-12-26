import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  // Only show first slot
  onlyShowFirstAvailableSlot: boolean;
  setOnlyShowFirstAvailableSlot: (value: boolean) => void;

  // Total duration
  limitTotalDuration: boolean;
  toggleTotalDuration: (value: boolean) => void;
  durationAnimationValue: Animated.Value;
  durationLimits: DurationLimit[];
  updateDurationLimit: (id: number, field: string, value: string) => void;
  setShowDurationUnitDropdown: (id: number) => void;
  removeDurationLimit: (id: number) => void;
  addDurationLimit: () => void;

  // Max active bookings
  maxActiveBookingsPerBooker: boolean;
  setMaxActiveBookingsPerBooker: (value: boolean) => void;
  maxActiveBookingsValue: string;
  setMaxActiveBookingsValue: (value: string) => void;
  offerReschedule: boolean;
  setOfferReschedule: (value: boolean) => void;

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

export function LimitsTab(props: LimitsTabProps) {
  return (
    <View className="gap-3">
      {/* Buffer Time, Minimum Notice, and Slot Interval Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="mb-3">
          <Text className="mb-1.5 text-base font-semibold text-[#333]">Before event</Text>
          <TouchableOpacity
            className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
            onPress={() => props.setShowBeforeBufferDropdown(true)}
          >
            <Text className="text-base text-black">{props.beforeEventBuffer}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View
          className="mb-3"
          style={{ borderTopWidth: 1, borderTopColor: "#E5E5EA", paddingTop: 12, marginTop: 12 }}
        >
          <Text className="mb-1.5 text-base font-semibold text-[#333]">After event</Text>
          <TouchableOpacity
            className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
            onPress={() => props.setShowAfterBufferDropdown(true)}
          >
            <Text className="text-base text-black">{props.afterEventBuffer}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View
          className="mb-3"
          style={{ borderTopWidth: 1, borderTopColor: "#E5E5EA", paddingTop: 12, marginTop: 12 }}
        >
          <Text className="mb-1.5 text-base font-semibold text-[#333]">Minimum Notice</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
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
              className="min-w-[100px] flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
              onPress={() => props.setShowMinimumNoticeUnitDropdown(true)}
            >
              <Text className="text-base text-black">{props.minimumNoticeUnit}</Text>
              <Ionicons name="chevron-down" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{ borderTopWidth: 1, borderTopColor: "#E5E5EA", paddingTop: 12, marginTop: 12 }}
        >
          <Text className="mb-1.5 text-base font-semibold text-[#333]">Time-slot intervals</Text>
          <TouchableOpacity
            className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
            onPress={() => props.setShowSlotIntervalDropdown(true)}
          >
            <Text className="text-base text-black">
              {props.slotInterval === "Default" ? "Use event length (default)" : props.slotInterval}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Booking Frequency Limit Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Limit booking frequency</Text>
            <Text className="text-sm leading-5 text-[#666]">
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
          ]}
        >
          {props.limitBookingFrequency ? (
            <>
              {props.frequencyLimits.map((limit) => (
                <View key={limit.id} className="mt-4 flex-row items-center gap-3">
                  <TextInput
                    className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
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
                    className="min-w-[100px] flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
                    onPress={() => props.setShowFrequencyUnitDropdown(limit.id)}
                  >
                    <Text className="text-base text-black">{limit.unit}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                  {props.frequencyLimits.length > 1 ? (
                    <TouchableOpacity
                      className="h-10 w-10 items-center justify-center rounded-lg border border-[#FFCCC7] bg-[#FFF1F0]"
                      onPress={() => props.removeFrequencyLimit(limit.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#800000" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity
                className="mt-4 flex-row items-center justify-center gap-2 rounded-lg border border-black bg-transparent px-2 py-3 md:px-4"
                onPress={props.addFrequencyLimit}
              >
                <Ionicons name="add" size={20} color="#000" />
                <Text className="text-base font-medium text-black">Add Limit</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Animated.View>
      </View>

      {/* 2. Only Show First Available Slot Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Only show the first slot of each day as available
            </Text>
            <Text className="text-sm leading-5 text-[#666]">
              This will limit your availability for this event type to one slot per day, scheduled
              at the earliest available time.
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

      {/* 3. Total Booking Duration Limit Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Limit total booking duration
            </Text>
            <Text className="text-sm leading-5 text-[#666]">
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
          ]}
        >
          {props.limitTotalDuration ? (
            <>
              {props.durationLimits.map((limit) => (
                <View key={limit.id} className="mt-4 flex-row items-center gap-3">
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
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
                    className="min-w-[100px] flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
                    onPress={() => props.setShowDurationUnitDropdown(limit.id)}
                  >
                    <Text className="text-base text-black">{limit.unit}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                  {props.durationLimits.length > 1 ? (
                    <TouchableOpacity
                      className="h-10 w-10 items-center justify-center rounded-lg border border-[#FFCCC7] bg-[#FFF1F0]"
                      onPress={() => props.removeDurationLimit(limit.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#800000" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity
                className="mt-4 flex-row items-center justify-center gap-2 rounded-lg border border-black bg-transparent px-2 py-3 md:px-4"
                onPress={props.addDurationLimit}
              >
                <Ionicons name="add" size={20} color="#000" />
                <Text className="text-base font-medium text-black">Add Limit</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Animated.View>
      </View>

      {/* 4. Max Active Bookings Per Booker Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Limit number of upcoming bookings per booker
            </Text>
            <Text className="text-sm leading-5 text-[#666]">
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
        {props.maxActiveBookingsPerBooker ? (
          <View className="mt-4 gap-3">
            <View className="flex-row items-center gap-3">
              <TextInput
                className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
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
              <Text className="text-base text-[#666]">bookings</Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => props.setOfferReschedule(!props.offerReschedule)}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                  props.offerReschedule ? "border-[#007AFF] bg-[#007AFF]" : "border-[#C7C7CC]"
                }`}
              >
                {props.offerReschedule && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text className="flex-1 text-sm text-[#333]">
                Offer to reschedule the last booking to the new time slot
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* 5. Limit Future Bookings Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Limit future bookings</Text>
            <Text className="text-sm leading-5 text-[#666]">
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
        {props.limitFutureBookings ? (
          <View className="mt-4 gap-3">
            {/* Rolling option */}
            <TouchableOpacity
              className="flex-row items-start"
              onPress={() => props.setFutureBookingType("rolling")}
            >
              <View
                className={`mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2 ${
                  props.futureBookingType === "rolling" ? "border-[#007AFF]" : "border-[#C7C7CC]"
                }`}
              >
                {props.futureBookingType === "rolling" ? (
                  <View className="h-2.5 w-2.5 rounded-full bg-[#007AFF]" />
                ) : null}
              </View>
              <View className="flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <TextInput
                    className="w-16 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-2 text-center text-base text-black"
                    value={props.rollingDays}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      props.setRollingDays(numericValue || "30");
                      props.setFutureBookingType("rolling");
                    }}
                    placeholder="30"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-2"
                    onPress={() => {
                      props.setRollingCalendarDays(!props.rollingCalendarDays);
                      props.setFutureBookingType("rolling");
                    }}
                  >
                    <Text className="text-base text-black">
                      {props.rollingCalendarDays ? "calendar days" : "business days"}
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-base text-[#666]">into the future</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Date Range option */}
            <TouchableOpacity
              className="flex-row items-start"
              onPress={() => props.setFutureBookingType("range")}
            >
              <View
                className={`mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2 ${
                  props.futureBookingType === "range" ? "border-[#007AFF]" : "border-[#C7C7CC]"
                }`}
              >
                {props.futureBookingType === "range" ? (
                  <View className="h-2.5 w-2.5 rounded-full bg-[#007AFF]" />
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-base text-[#333]">Within a date range</Text>
                {props.futureBookingType === "range" ? (
                  <View className="gap-2">
                    <TextInput
                      className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-2 text-base text-black"
                      value={props.rangeStartDate}
                      onChangeText={props.setRangeStartDate}
                      placeholder="Start date (YYYY-MM-DD)"
                      placeholderTextColor="#8E8E93"
                    />
                    <TextInput
                      className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-2 text-base text-black"
                      value={props.rangeEndDate}
                      onChangeText={props.setRangeEndDate}
                      placeholder="End date (YYYY-MM-DD)"
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}
