/**
 * BasicsTab Component
 *
 * iOS Settings style with grouped input rows and section headers.
 */

import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { LocationsList, AddLocationTrigger } from "@/components/LocationsList";
import { createLocationItemFromOption } from "@/utils/locationHelpers";
import type { LocationItem, LocationOptionGroup } from "@/types/locations";
import { slugify } from "@/utils/slugify";
import type React from "react";
import { useState } from "react";

interface BasicsTabProps {
  eventTitle: string;
  setEventTitle: (value: string) => void;
  eventDescription: string;
  setEventDescription: (value: string) => void;
  username: string;
  eventSlug: string;
  setEventSlug: (value: string) => void;
  allowMultipleDurations: boolean;
  setAllowMultipleDurations: (value: boolean) => void;
  eventDuration: string;
  setEventDuration: (value: string) => void;
  selectedDurations: string[];
  setShowDurationDropdown: (show: boolean) => void;
  defaultDuration: string;
  setDefaultDuration: (value: string) => void;
  setShowDefaultDurationDropdown: (show: boolean) => void;
  locations: LocationItem[];
  onAddLocation: (location: LocationItem) => void;
  onRemoveLocation: (locationId: string) => void;
  onUpdateLocation: (locationId: string, updates: Partial<LocationItem>) => void;
  locationOptions: LocationOptionGroup[];
  conferencingLoading: boolean;
}

// Section header
function SectionHeader({ title, rightElement }: { title: string; rightElement?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between mb-2 px-4">
      <Text
        className="text-[13px] uppercase tracking-wide text-[#6D6D72]"
        style={{ letterSpacing: 0.5 }}
      >
        {title}
      </Text>
      {rightElement}
    </View>
  );
}

// Settings group container
function SettingsGroup({
  children,
  header,
  headerRight,
}: {
  children: React.ReactNode;
  header?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <View>
      {header ? <SectionHeader title={header} rightElement={headerRight} /> : null}
      <View className="overflow-hidden rounded-[14px] bg-white">{children}</View>
    </View>
  );
}

// Input row with label
function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  keyboardType = "default",
  isFirst = false,
  isLast = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "numeric" | "email-address" | "url";
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <View className="bg-white pl-4">
      <View
        className={`pr-4 ${!isLast ? "border-b border-[#E5E5E5]" : ""} ${
          isFirst ? "pt-4 pb-3" : isLast ? "pt-3 pb-4" : "py-3"
        }`}
      >
        <Text className="mb-2 text-[13px] text-[#6D6D72]">{label}</Text>
        <TextInput
          className="rounded-lg bg-[#F2F2F7] px-3 py-2 text-[17px] text-black"
          style={multiline ? { height: 80, textAlignVertical: "top" } : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

// Navigation row with value and chevron
function NavigationRow({
  title,
  value,
  onPress,
  isFirst = false,
  isLast = false,
  options,
  onSelect,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  options?: string[];
  onSelect?: (value: string) => void;
}) {
  const height = isFirst || isLast ? 52 : 44;
  return (
    <View className="bg-white pl-4" style={{ height }}>
      <View
        className={`flex-1 flex-row items-center justify-between pr-4 ${
          !isLast ? "border-b border-[#E5E5E5]" : ""
        }`}
        style={{ height }}
      >
        <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
          {title}
        </Text>
        <View className="flex-row items-center">
          {Platform.OS === "ios" && options && onSelect ? (
            <>
              {value ? (
                <Text className="mr-2 text-[17px] text-[#8E8E93]" numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <IOSPickerTrigger options={options} selectedValue={value || ""} onSelect={onSelect} />
            </>
          ) : (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={onPress}
              activeOpacity={0.5}
            >
              {value ? (
                <Text className="mr-1 text-[17px] text-[#8E8E93]" numberOfLines={1}>
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

// iOS Native Picker trigger component
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

// Toggle row
function SettingRow({
  title,
  value,
  onValueChange,
  isFirst = false,
  isLast = false,
}: {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const height = isFirst || isLast ? 52 : 44;
  return (
    <View className="bg-white pl-4">
      <View
        className={`flex-row items-center pr-4 ${!isLast ? "border-b border-[#E5E5E5]" : ""}`}
        style={{ height }}
      >
        <Text className="flex-1 text-[17px] text-black" style={{ fontWeight: "400" }}>
          {title}
        </Text>
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

export const BasicsTab: React.FC<BasicsTabProps> = (props) => {
  const [showLocationModal, setShowLocationModal] = useState(false);

  const onSelectLocation = (value: string, label: string) => {
    const newLocation = createLocationItemFromOption(value, label);
    props.onAddLocation(newLocation);
    setShowLocationModal(false);
  };

  return (
    <View className="gap-6">
      {/* Event Details */}
      <SettingsGroup>
        <InputRow
          isFirst
          label="Title"
          value={props.eventTitle}
          onChangeText={props.setEventTitle}
          placeholder="Enter event title"
        />
        <InputRow
          label="Description"
          value={props.eventDescription}
          onChangeText={props.setEventDescription}
          placeholder="Enter event description"
          multiline
          numberOfLines={4}
        />
        {/* URL Input */}
        <View className="bg-white pl-4">
          <View className="pr-4 pt-3 pb-4">
            <Text className="mb-2 text-[13px] text-[#6D6D72]">URL</Text>
            <View className="flex-row items-center overflow-hidden rounded-lg bg-[#F2F2F7]">
              <Text className="bg-[#E5E5EA] px-3 py-2 text-[15px] text-[#666]">
                cal.com/{props.username}/
              </Text>
              <TextInput
                className="flex-1 px-3 py-2 text-[17px] text-black"
                value={props.eventSlug}
                onChangeText={(text) => props.setEventSlug(slugify(text, true))}
                placeholder="event-slug"
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>
        </View>
      </SettingsGroup>

      {/* Duration */}
      <SettingsGroup header="Duration">
        {!props.allowMultipleDurations ? (
          <View className="bg-white pl-4" style={{ height: 52 }}>
            <View
              className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4"
              style={{ height: 52 }}
            >
              <Text className="text-[17px] text-black">Duration</Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-16 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
                  value={props.eventDuration}
                  onChangeText={props.setEventDuration}
                  placeholder="30"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                <Text className="text-[15px] text-[#6D6D72]">minutes</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <NavigationRow
              isFirst
              title="Available durations"
              value={
                props.selectedDurations.length > 0
                  ? `${props.selectedDurations.length} selected`
                  : "Select"
              }
              onPress={() => props.setShowDurationDropdown(true)}
            />
            {props.selectedDurations.length > 0 ? (
              <NavigationRow
                title="Default duration"
                value={props.defaultDuration || "Select"}
                onPress={() => props.setShowDefaultDurationDropdown(true)}
                options={props.selectedDurations}
                onSelect={props.setDefaultDuration}
              />
            ) : null}
          </>
        )}
        <SettingRow
          title="Multiple durations"
          value={props.allowMultipleDurations}
          onValueChange={props.setAllowMultipleDurations}
          isLast
        />
      </SettingsGroup>

      {/* Locations */}
      <SettingsGroup
        header="Locations"
        headerRight={
          <AddLocationTrigger
            isHeader
            locations={props.locations}
            locationOptions={props.locationOptions}
            onSelectOption={onSelectLocation}
            onPressFallback={() => setShowLocationModal(true)}
            disabled={props.conferencingLoading}
          />
        }
      >
        <LocationsList
          locations={props.locations}
          onAdd={props.onAddLocation}
          onRemove={props.onRemoveLocation}
          onUpdate={props.onUpdateLocation}
          locationOptions={props.locationOptions}
          loading={props.conferencingLoading}
          hideAddButton={true}
          showAddModal={showLocationModal}
          onShowAddModalChange={setShowLocationModal}
        />
      </SettingsGroup>
    </View>
  );
};
