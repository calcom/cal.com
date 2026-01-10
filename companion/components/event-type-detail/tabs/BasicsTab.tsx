/**
 * BasicsTab Component
 *
 * iOS Settings style with grouped input rows and section headers.
 */

import { Ionicons } from "@expo/vector-icons";
import { Platform, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { LocationsList } from "@/components/LocationsList";
import type { LocationItem, LocationOptionGroup } from "@/types/locations";
import { slugify } from "@/utils/slugify";

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
  setShowDefaultDurationDropdown: (show: boolean) => void;
  locations: LocationItem[];
  onAddLocation: (location: LocationItem) => void;
  onRemoveLocation: (locationId: string) => void;
  onUpdateLocation: (locationId: string, updates: Partial<LocationItem>) => void;
  locationOptions: LocationOptionGroup[];
  conferencingLoading: boolean;
}

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
function SettingsGroup({ children, header }: { children: React.ReactNode; header?: string }) {
  return (
    <View>
      {header ? <SectionHeader title={header} /> : null}
      <View className="overflow-hidden rounded-[10px] bg-white">{children}</View>
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
  isLast = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "numeric" | "email-address" | "url";
  isLast?: boolean;
}) {
  return (
    <View className="bg-white pl-4">
      <View className={`pr-4 py-3 ${!isLast ? "border-b border-[#E5E5E5]" : ""}`}>
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
  isLast = false,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <View className="bg-white pl-4" style={{ minHeight: 44 }}>
      <TouchableOpacity
        className={`flex-1 flex-row items-center justify-between pr-4 ${
          !isLast ? "border-b border-[#E5E5E5]" : ""
        }`}
        style={{ minHeight: 44 }}
        onPress={onPress}
        activeOpacity={0.5}
      >
        <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
          {title}
        </Text>
        <View className="flex-row items-center">
          {value ? (
            <Text className="mr-1 text-[17px] text-[#8E8E93]" numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Toggle row
function SettingRow({
  title,
  value,
  onValueChange,
  isLast = false,
}: {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View className="bg-white pl-4">
      <View
        className={`flex-row items-center pr-4 ${!isLast ? "border-b border-[#E5E5E5]" : ""}`}
        style={{ height: 44 }}
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

export function BasicsTab(props: BasicsTabProps) {
  return (
    <View className="gap-6">
      {/* Event Details */}
      <SettingsGroup>
        <InputRow
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
          <View className="pr-4 py-3">
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
          <View className="bg-white pl-4">
            <View
              className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4"
              style={{ height: 44 }}
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
      <SettingsGroup header="Locations">
        <View className="bg-white p-4">
          <LocationsList
            locations={props.locations}
            onAdd={props.onAddLocation}
            onRemove={props.onRemoveLocation}
            onUpdate={props.onUpdateLocation}
            locationOptions={props.locationOptions}
            loading={props.conferencingLoading}
          />
        </View>
      </SettingsGroup>
    </View>
  );
}
