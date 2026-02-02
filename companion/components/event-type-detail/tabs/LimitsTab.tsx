/**
 * LimitsTab Component
 *
 * Settings app style with grouped rows, section headers, and compact toggles.
 * Uses native iOS ContextMenu for pickers on iOS, Modal-based dropdowns on Android/Web.
 */

import { Ionicons } from "@expo/vector-icons";
import { type Animated, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";

import { NavigationRow, SettingRow, SettingsGroup } from "../SettingsUI";
import { LimitsTabDatePicker } from "./LimitsTabDatePicker";
import { LimitsTabIOSPicker } from "./LimitsTabIOSPicker";
import { getColors } from "@/constants/colors";
import { useColorScheme } from "react-native";

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

// Buffer time options
const BUFFER_TIME_OPTIONS = [
  "No buffer time",
  "5 Minutes",
  "10 Minutes",
  "15 Minutes",
  "20 Minutes",
  "30 Minutes",
  "45 Minutes",
  "60 Minutes",
  "90 Minutes",
  "120 Minutes",
];

// Time unit options
const TIME_UNIT_OPTIONS = ["Minutes", "Hours", "Days"];

// Slot interval options
const SLOT_INTERVAL_OPTIONS = [
  "Default",
  "5 Minutes",
  "10 Minutes",
  "15 Minutes",
  "20 Minutes",
  "30 Minutes",
  "45 Minutes",
  "60 Minutes",
  "75 Minutes",
  "90 Minutes",
  "105 Minutes",
  "120 Minutes",
];

// Frequency unit options
const FREQUENCY_UNIT_OPTIONS = ["Per day", "Per week", "Per month", "Per year"];

// Duration unit options
const DURATION_UNIT_OPTIONS = ["Per day", "Per week", "Per month"];

// Local components removed in favor of SettingsUI

// Android/Web picker button (opens modal)
// Android/Web picker button (opens modal)
function ModalPickerButton({ value, onPress }: { value: string; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");
  return (
    <TouchableOpacity
      className="flex-row items-center rounded-lg px-2 py-1.5"
      style={{ backgroundColor: theme.backgroundMuted }}
      onPress={onPress}
    >
      <Text className="text-[15px]" style={{ color: theme.text }}>
        {value}
      </Text>
      <Ionicons name="chevron-down" size={14} color={theme.textMuted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// Navigation row with native iOS picker or modal button

interface LimitsTabProps {
  beforeEventBuffer: string;
  setBeforeEventBuffer: (value: string) => void;
  setShowBeforeBufferDropdown: (show: boolean) => void;
  afterEventBuffer: string;
  setAfterEventBuffer: (value: string) => void;
  setShowAfterBufferDropdown: (show: boolean) => void;
  minimumNoticeValue: string;
  setMinimumNoticeValue: (value: string) => void;
  minimumNoticeUnit: string;
  setMinimumNoticeUnit: (value: string) => void;
  setShowMinimumNoticeUnitDropdown: (show: boolean) => void;
  slotInterval: string;
  setSlotInterval: (value: string) => void;
  setShowSlotIntervalDropdown: (show: boolean) => void;
  limitBookingFrequency: boolean;
  toggleBookingFrequency: (value: boolean) => void;
  frequencyAnimationValue: Animated.Value;
  frequencyLimits: FrequencyLimit[];
  updateFrequencyLimit: (id: number, field: "value" | "unit", value: string) => void;
  setShowFrequencyUnitDropdown: (id: number) => void;
  removeFrequencyLimit: (id: number) => void;
  addFrequencyLimit: () => void;
  onlyShowFirstAvailableSlot: boolean;
  setOnlyShowFirstAvailableSlot: (value: boolean) => void;
  limitTotalDuration: boolean;
  toggleTotalDuration: (value: boolean) => void;
  durationAnimationValue: Animated.Value;
  durationLimits: DurationLimit[];
  updateDurationLimit: (id: number, field: "value" | "unit", value: string) => void;
  setShowDurationUnitDropdown: (id: number) => void;
  removeDurationLimit: (id: number) => void;
  addDurationLimit: () => void;
  maxActiveBookingsPerBooker: boolean;
  setMaxActiveBookingsPerBooker: (value: boolean) => void;
  maxActiveBookingsValue: string;
  setMaxActiveBookingsValue: (value: string) => void;
  offerReschedule: boolean;
  setOfferReschedule: (value: boolean) => void;
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
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");

  return (
    <View className="gap-6">
      {/* Buffer & Notice Settings */}
      <SettingsGroup header="Buffer & Notice">
        <NavigationRow
          title="Before event"
          value={props.beforeEventBuffer}
          options={BUFFER_TIME_OPTIONS.map((o) => ({ label: o, value: o }))}
          onSelect={props.setBeforeEventBuffer}
          onPress={() => props.setShowBeforeBufferDropdown(true)}
        />
        <NavigationRow
          title="After event"
          value={props.afterEventBuffer}
          options={BUFFER_TIME_OPTIONS.map((o) => ({ label: o, value: o }))}
          onSelect={props.setAfterEventBuffer}
          onPress={() => props.setShowAfterBufferDropdown(true)}
        />
        <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
          <View
            className="flex-row items-center justify-between pr-4"
            style={{ height: 44, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}
          >
            <Text className="text-[17px]" style={{ color: theme.text }}>
              Minimum Notice
            </Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="w-16 rounded-lg px-2 py-1.5 text-center text-[15px]"
                style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                value={props.minimumNoticeValue}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, "");
                  props.setMinimumNoticeValue(numericValue);
                }}
                placeholder="1"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />
              {Platform.OS === "ios" ? (
                <View className="flex-row items-center">
                  <Text className="mr-1 text-[17px]" style={{ color: theme.textMuted }}>
                    {props.minimumNoticeUnit}
                  </Text>
                  <LimitsTabIOSPicker
                    options={TIME_UNIT_OPTIONS}
                    selectedValue={props.minimumNoticeUnit}
                    onSelect={props.setMinimumNoticeUnit}
                  />
                </View>
              ) : (
                <ModalPickerButton
                  value={props.minimumNoticeUnit}
                  onPress={() => props.setShowMinimumNoticeUnitDropdown(true)}
                />
              )}
            </View>
          </View>
        </View>
        <NavigationRow
          title="Time-slot intervals"
          value={props.slotInterval === "Default" ? "Event length" : props.slotInterval}
          options={SLOT_INTERVAL_OPTIONS.map((o) => ({ label: o, value: o }))}
          onSelect={props.setSlotInterval}
          onPress={() => props.setShowSlotIntervalDropdown(true)}
          isLast
        />
      </SettingsGroup>

      {/* Booking Limits */}
      <SettingsGroup header="Booking Limits">
        <SettingRow
          title="Limit booking frequency"
          description="Limit how many times this event can be booked."
          value={props.limitBookingFrequency}
          onValueChange={props.toggleBookingFrequency}
        />
        <SettingRow
          title="First slot only"
          description="Only show the first slot of each day as available. This will limit your availability for this event type to one slot per day, scheduled at the earliest available time."
          value={props.onlyShowFirstAvailableSlot}
          onValueChange={props.setOnlyShowFirstAvailableSlot}
        />
        <SettingRow
          title="Limit total duration"
          description="Limit total amount of time that this event can be booked."
          value={props.limitTotalDuration}
          onValueChange={props.toggleTotalDuration}
        />
        <SettingRow
          title="Limit active bookings"
          description="Limit the number of active bookings a booker can make for this event type."
          value={props.maxActiveBookingsPerBooker}
          onValueChange={props.setMaxActiveBookingsPerBooker}
        />
        <SettingRow
          title="Limit future bookings"
          description="Limit how far in the future this event can be booked."
          value={props.limitFutureBookings}
          onValueChange={props.setLimitFutureBookings}
          isLast
        />
      </SettingsGroup>

      {/* Frequency Limit Configuration */}
      {props.limitBookingFrequency ? (
        <SettingsGroup header="Frequency Limits">
          {props.frequencyLimits.map((limit, index) => (
            <View
              key={limit.id}
              className="bg-white pl-4"
              style={{ backgroundColor: theme.backgroundSecondary }}
            >
              <View
                className={`flex-row items-center justify-between pr-4 py-3`}
                style={{
                  borderBottomWidth: index !== props.frequencyLimits.length - 1 ? 1 : 0,
                  borderBottomColor: theme.borderSubtle,
                }}
              >
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="w-16 rounded-lg px-2 py-1.5 text-center text-[15px]"
                    style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                    value={limit.value}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      props.updateFrequencyLimit(limit.id, "value", numericValue);
                    }}
                    placeholder="1"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                  <Text className="text-[15px]" style={{ color: theme.textSecondary }}>
                    per
                  </Text>
                  {Platform.OS === "ios" ? (
                    <View className="flex-row items-center">
                      <Text className="mr-1 text-[17px]" style={{ color: theme.textMuted }}>
                        {limit.unit}
                      </Text>
                      <LimitsTabIOSPicker
                        options={FREQUENCY_UNIT_OPTIONS}
                        selectedValue={limit.unit}
                        onSelect={(value: string) =>
                          props.updateFrequencyLimit(limit.id, "unit", value)
                        }
                      />
                    </View>
                  ) : (
                    <ModalPickerButton
                      value={limit.unit}
                      onPress={() => props.setShowFrequencyUnitDropdown(limit.id)}
                    />
                  )}
                </View>
                {props.frequencyLimits.length > 1 ? (
                  <TouchableOpacity onPress={() => props.removeFrequencyLimit(limit.id)}>
                    <Ionicons name="trash-outline" size={20} color={theme.destructive} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
          <TouchableOpacity
            className="flex-row items-center justify-center py-3"
            style={{ backgroundColor: theme.background }}
            onPress={props.addFrequencyLimit}
          >
            <Ionicons name="add" size={20} color={theme.accent} />
            <Text className="ml-1 text-[17px]" style={{ color: theme.accent }}>
              Add Limit
            </Text>
          </TouchableOpacity>
        </SettingsGroup>
      ) : null}

      {/* Duration Limit Configuration */}
      {props.limitTotalDuration ? (
        <SettingsGroup header="Duration Limits">
          {props.durationLimits.map((limit, index) => (
            <View
              key={limit.id}
              className="bg-white pl-4"
              style={{ backgroundColor: theme.backgroundSecondary }}
            >
              <View
                className={`flex-row items-center justify-between pr-4 py-3`}
                style={{
                  borderBottomWidth: index !== props.durationLimits.length - 1 ? 1 : 0,
                  borderBottomColor: theme.borderSubtle,
                }}
              >
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="w-16 rounded-lg px-2 py-1.5 text-center text-[15px]"
                    style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                    value={limit.value}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      props.updateDurationLimit(limit.id, "value", numericValue);
                    }}
                    placeholder="60"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                  <Text className="text-[15px]" style={{ color: theme.textSecondary }}>
                    minutes per
                  </Text>
                  {Platform.OS === "ios" ? (
                    <View className="flex-row items-center">
                      <Text className="mr-1 text-[17px]" style={{ color: theme.textMuted }}>
                        {limit.unit}
                      </Text>
                      <LimitsTabIOSPicker
                        options={DURATION_UNIT_OPTIONS}
                        selectedValue={limit.unit}
                        onSelect={(value: string) =>
                          props.updateDurationLimit(limit.id, "unit", value)
                        }
                      />
                    </View>
                  ) : (
                    <ModalPickerButton
                      value={limit.unit}
                      onPress={() => props.setShowDurationUnitDropdown(limit.id)}
                    />
                  )}
                </View>
                {props.durationLimits.length > 1 ? (
                  <TouchableOpacity onPress={() => props.removeDurationLimit(limit.id)}>
                    <Ionicons name="trash-outline" size={20} color={theme.destructive} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
          <TouchableOpacity
            className="flex-row items-center justify-center py-3"
            style={{ backgroundColor: theme.background }}
            onPress={props.addDurationLimit}
          >
            <Ionicons name="add" size={20} color={theme.accent} />
            <Text className="ml-1 text-[17px]" style={{ color: theme.accent }}>
              Add Limit
            </Text>
          </TouchableOpacity>
        </SettingsGroup>
      ) : null}

      {/* Max Active Bookings Configuration */}
      {props.maxActiveBookingsPerBooker ? (
        <SettingsGroup header="Active Bookings Limit">
          <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
            <View
              className="flex-row items-center justify-between pr-4"
              style={{ height: 44, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}
            >
              <Text className="text-[17px]" style={{ color: theme.text }}>
                Max bookings
              </Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-16 rounded-lg px-2 py-1.5 text-center text-[15px]"
                  style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                  value={props.maxActiveBookingsValue}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    props.setMaxActiveBookingsValue(numericValue);
                  }}
                  placeholder="1"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                />
                <Text className="text-[15px]" style={{ color: theme.textSecondary }}>
                  bookings
                </Text>
              </View>
            </View>
          </View>
          <SettingRow
            title="Offer reschedule"
            description="Offer to reschedule the last booking to the new time slot."
            value={props.offerReschedule}
            onValueChange={props.setOfferReschedule}
            isLast
          />
        </SettingsGroup>
      ) : null}

      {/* Future Bookings Configuration */}
      {props.limitFutureBookings ? (
        <SettingsGroup header="Future Booking Limit">
          {/* Rolling option */}
          <TouchableOpacity
            className="bg-white pl-4"
            style={{ backgroundColor: theme.backgroundSecondary }}
            onPress={() => props.setFutureBookingType("rolling")}
            activeOpacity={0.7}
          >
            <View
              className="flex-row items-center pr-4 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2`}
                style={{
                  borderColor:
                    props.futureBookingType === "rolling" ? theme.accent : theme.borderLight,
                }}
              >
                {props.futureBookingType === "rolling" ? (
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                ) : null}
              </View>
              <View className="flex-1 flex-row flex-wrap items-center gap-2">
                <TextInput
                  className="w-14 rounded-lg px-2 py-1.5 text-center text-[15px]"
                  style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                  value={props.rollingDays}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    props.setRollingDays(numericValue);
                    props.setFutureBookingType("rolling");
                  }}
                  placeholder="30"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  className="rounded-lg px-2 py-1.5"
                  style={{ backgroundColor: theme.backgroundMuted }}
                  onPress={() => {
                    props.setRollingCalendarDays(!props.rollingCalendarDays);
                    props.setFutureBookingType("rolling");
                  }}
                >
                  <Text className="text-[15px]" style={{ color: theme.text }}>
                    {props.rollingCalendarDays ? "calendar" : "business"}
                  </Text>
                </TouchableOpacity>
                <Text className="text-[15px]" style={{ color: theme.textSecondary }}>
                  days ahead
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Date Range option */}
          <TouchableOpacity
            className="bg-white pl-4"
            style={{ backgroundColor: theme.backgroundSecondary }}
            onPress={() => props.setFutureBookingType("range")}
            activeOpacity={0.7}
          >
            <View className="flex-row items-start pr-4 py-3">
              <View
                className={`mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2`}
                style={{
                  borderColor:
                    props.futureBookingType === "range" ? theme.accent : theme.borderLight,
                }}
              >
                {props.futureBookingType === "range" ? (
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-[17px]" style={{ color: theme.text }}>
                  Within a date range
                </Text>
                {props.futureBookingType === "range" ? (
                  <View className="gap-3">
                    <View className="flex-row items-center">
                      <Text className="w-20 text-[13px]" style={{ color: theme.textSecondary }}>
                        Start date
                      </Text>
                      <LimitsTabDatePicker
                        value={props.rangeStartDate}
                        onChange={props.setRangeStartDate}
                        placeholder="Select start date"
                      />
                    </View>
                    <View className="flex-row items-center">
                      <Text className="w-20 text-[13px]" style={{ color: theme.textSecondary }}>
                        End date
                      </Text>
                      <LimitsTabDatePicker
                        value={props.rangeEndDate}
                        onChange={props.setRangeEndDate}
                        placeholder="Select end date"
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </SettingsGroup>
      ) : null}
    </View>
  );
}
