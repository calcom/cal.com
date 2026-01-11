/**
 * LimitsTab Component
 *
 * Settings app style with grouped rows, section headers, and compact toggles.
 * Uses native iOS ContextMenu for pickers on iOS, Modal-based dropdowns on Android/Web.
 */

import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
  Alert,
  type Animated,
  Platform,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="mb-2 ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72]"
      style={{ letterSpacing: 0.5 }}
    >
      {title}
    </Text>
  );
}

// Settings group container
function SettingsGroup({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header?: string;
  footer?: string;
}) {
  return (
    <View>
      {header ? <SectionHeader title={header} /> : null}
      <View className="overflow-hidden rounded-[14px] bg-white">{children}</View>
      {footer ? <Text className="ml-4 mt-2 text-[13px] text-[#6D6D72]">{footer}</Text> : null}
    </View>
  );
}

// Toggle row with indented separator
function SettingRow({
  title,
  description,
  value,
  onValueChange,
  isLast = false,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  const showDescription = () => {
    if (!description) return;
    Alert.alert(title, description, [{ text: "OK", style: "cancel" }]);
  };

  return (
    <View className="bg-white pl-4">
      <View
        className={`flex-row items-center pr-4 ${!isLast ? "border-b border-[#E5E5E5]" : ""}`}
        style={{ height: 44 }}
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center"
          style={{ height: 44 }}
          onPress={description ? showDescription : undefined}
          activeOpacity={description ? 0.7 : 1}
          disabled={!description}
        >
          <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
            {title}
          </Text>
          {description ? (
            <Ionicons name="chevron-down" size={12} color="#C7C7CC" style={{ marginLeft: 6 }} />
          ) : null}
        </TouchableOpacity>
        <View style={{ alignSelf: "center" }}>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: "#E9E9EA", true: "#000000" }}
            thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
          />
        </View>
      </View>
    </View>
  );
}

// iOS Native Picker using ContextMenu - only renders the chevron trigger
function IOSPickerTrigger({
  options,
  selectedValue,
  onSelect,
}: {
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Host matchContents>
      <ContextMenu
        modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
        activationMethod="singlePress"
      >
        <ContextMenu.Items>
          {options.map((opt) => (
            <Button
              key={opt}
              systemImage={selectedValue === opt ? "checkmark" : undefined}
              onPress={() => onSelect(opt)}
              label={opt}
            />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <HStack>
            <Image systemName="chevron.up.chevron.down" color="primary" size={13} />
          </HStack>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}

// Android/Web picker button (opens modal)
function ModalPickerButton({ value, onPress }: { value: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="flex-row items-center rounded-lg bg-[#F2F2F7] px-2 py-1.5"
      onPress={onPress}
    >
      <Text className="text-[15px] text-black">{value}</Text>
      <Ionicons name="chevron-down" size={14} color="#8E8E93" style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// Navigation row with native iOS picker or modal button
function PickerNavigationRow({
  title,
  value,
  options,
  onSelect,
  onPressModal,
  isLast = false,
}: {
  title: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  onPressModal: () => void;
  isLast?: boolean;
}) {
  return (
    <View className="bg-white pl-4" style={{ height: 44 }}>
      <View
        className={`flex-1 flex-row items-center justify-between pr-4 ${
          !isLast ? "border-b border-[#E5E5E5]" : ""
        }`}
        style={{ height: 44 }}
      >
        <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
          {title}
        </Text>
        <View className="flex-row items-center">
          {Platform.OS === "ios" ? (
            <>
              <Text className="mr-2 text-[17px] text-[#8E8E93]">{value}</Text>
              <IOSPickerTrigger options={options} selectedValue={value} onSelect={onSelect} />
            </>
          ) : (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={onPressModal}
              activeOpacity={0.5}
            >
              <Text className="mr-1 text-[17px] text-[#8E8E93]" numberOfLines={1}>
                {value}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

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
  return (
    <View className="gap-6">
      {/* Buffer & Notice Settings */}
      <SettingsGroup header="Buffer & Notice">
        <PickerNavigationRow
          title="Before event"
          value={props.beforeEventBuffer}
          options={BUFFER_TIME_OPTIONS}
          onSelect={props.setBeforeEventBuffer}
          onPressModal={() => props.setShowBeforeBufferDropdown(true)}
        />
        <PickerNavigationRow
          title="After event"
          value={props.afterEventBuffer}
          options={BUFFER_TIME_OPTIONS}
          onSelect={props.setAfterEventBuffer}
          onPressModal={() => props.setShowAfterBufferDropdown(true)}
        />
        <View className="bg-white pl-4">
          <View
            className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4"
            style={{ height: 44 }}
          >
            <Text className="text-[17px] text-black">Minimum Notice</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="w-16 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
                value={props.minimumNoticeValue}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, "");
                  const num = parseInt(numericValue, 10) || 0;
                  if (num >= 0) {
                    props.setMinimumNoticeValue(numericValue || "0");
                  }
                }}
                placeholder="1"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
              {Platform.OS === "ios" ? (
                <View className="flex-row items-center">
                  <Text className="mr-1 text-[17px] text-[#8E8E93]">{props.minimumNoticeUnit}</Text>
                  <IOSPickerTrigger
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
        <PickerNavigationRow
          title="Time-slot intervals"
          value={props.slotInterval === "Default" ? "Event length" : props.slotInterval}
          options={SLOT_INTERVAL_OPTIONS}
          onSelect={props.setSlotInterval}
          onPressModal={() => props.setShowSlotIntervalDropdown(true)}
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
            <View key={limit.id} className="bg-white pl-4">
              <View
                className={`flex-row items-center justify-between pr-4 py-3 ${
                  index !== props.frequencyLimits.length - 1 ? "border-b border-[#E5E5E5]" : ""
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="w-16 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
                    value={limit.value}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      const num = parseInt(numericValue, 10) || 0;
                      if (num >= 0) {
                        props.updateFrequencyLimit(limit.id, "value", numericValue || "0");
                      }
                    }}
                    placeholder="1"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                  />
                  <Text className="text-[15px] text-[#6D6D72]">per</Text>
                  {Platform.OS === "ios" ? (
                    <View className="flex-row items-center">
                      <Text className="mr-1 text-[17px] text-[#8E8E93]">{limit.unit}</Text>
                      <IOSPickerTrigger
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
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
          <TouchableOpacity
            className="flex-row items-center justify-center bg-white py-3"
            onPress={props.addFrequencyLimit}
          >
            <Ionicons name="add" size={20} color="#007AFF" />
            <Text className="ml-1 text-[17px] text-[#007AFF]">Add Limit</Text>
          </TouchableOpacity>
        </SettingsGroup>
      ) : null}

      {/* Duration Limit Configuration */}
      {props.limitTotalDuration ? (
        <SettingsGroup header="Duration Limits">
          {props.durationLimits.map((limit, index) => (
            <View key={limit.id} className="bg-white pl-4">
              <View
                className={`flex-row items-center justify-between pr-4 py-3 ${
                  index !== props.durationLimits.length - 1 ? "border-b border-[#E5E5E5]" : ""
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="w-16 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
                    value={limit.value}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      const num = parseInt(numericValue, 10) || 0;
                      if (num >= 0) {
                        props.updateDurationLimit(limit.id, "value", numericValue || "0");
                      }
                    }}
                    placeholder="60"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                  />
                  <Text className="text-[15px] text-[#6D6D72]">minutes per</Text>
                  {Platform.OS === "ios" ? (
                    <View className="flex-row items-center">
                      <Text className="mr-1 text-[17px] text-[#8E8E93]">{limit.unit}</Text>
                      <IOSPickerTrigger
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
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
          <TouchableOpacity
            className="flex-row items-center justify-center bg-white py-3"
            onPress={props.addDurationLimit}
          >
            <Ionicons name="add" size={20} color="#007AFF" />
            <Text className="ml-1 text-[17px] text-[#007AFF]">Add Limit</Text>
          </TouchableOpacity>
        </SettingsGroup>
      ) : null}

      {/* Max Active Bookings Configuration */}
      {props.maxActiveBookingsPerBooker ? (
        <SettingsGroup header="Active Bookings Limit">
          <View className="bg-white pl-4">
            <View
              className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4"
              style={{ height: 44 }}
            >
              <Text className="text-[17px] text-black">Max bookings</Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-16 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
                  value={props.maxActiveBookingsValue}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    const num = parseInt(numericValue, 10) || 0;
                    if (num >= 0) {
                      props.setMaxActiveBookingsValue(numericValue || "1");
                    }
                  }}
                  placeholder="1"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                <Text className="text-[15px] text-[#6D6D72]">bookings</Text>
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
            onPress={() => props.setFutureBookingType("rolling")}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center border-b border-[#E5E5E5] pr-4 py-3">
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                  props.futureBookingType === "rolling" ? "border-[#007AFF]" : "border-[#C7C7CC]"
                }`}
              >
                {props.futureBookingType === "rolling" ? (
                  <View className="h-2.5 w-2.5 rounded-full bg-[#007AFF]" />
                ) : null}
              </View>
              <View className="flex-1 flex-row flex-wrap items-center gap-2">
                <TextInput
                  className="w-14 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
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
                  className="rounded-lg bg-[#F2F2F7] px-2 py-1.5"
                  onPress={() => {
                    props.setRollingCalendarDays(!props.rollingCalendarDays);
                    props.setFutureBookingType("rolling");
                  }}
                >
                  <Text className="text-[15px] text-black">
                    {props.rollingCalendarDays ? "calendar" : "business"}
                  </Text>
                </TouchableOpacity>
                <Text className="text-[15px] text-[#6D6D72]">days ahead</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Date Range option */}
          <TouchableOpacity
            className="bg-white pl-4"
            onPress={() => props.setFutureBookingType("range")}
            activeOpacity={0.7}
          >
            <View className="flex-row items-start pr-4 py-3">
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
                <Text className="mb-2 text-[17px] text-black">Within a date range</Text>
                {props.futureBookingType === "range" ? (
                  <View className="gap-2">
                    <TextInput
                      className="rounded-lg bg-[#F2F2F7] px-3 py-2 text-[15px] text-black"
                      value={props.rangeStartDate}
                      onChangeText={props.setRangeStartDate}
                      placeholder="Start date (YYYY-MM-DD)"
                      placeholderTextColor="#8E8E93"
                    />
                    <TextInput
                      className="rounded-lg bg-[#F2F2F7] px-3 py-2 text-[15px] text-black"
                      value={props.rangeEndDate}
                      onChangeText={props.setRangeEndDate}
                      placeholder="End date (YYYY-MM-DD)"
                      placeholderTextColor="#8E8E93"
                    />
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
