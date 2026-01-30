/**
 * BasicsTab Component
 *
 * iOS Settings style with grouped input rows and section headers.
 */

import type React from "react";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AddLocationTrigger, LocationsList } from "@/components/LocationsList";
import type { LocationItem, LocationOptionGroup } from "@/types/locations";
import { createLocationItemFromOption } from "@/utils/locationHelpers";
import { slugify } from "@/utils/slugify";
import { NavigationRow, SettingRow, SettingsGroup } from "../SettingsUI";
import { getColors } from "@/constants/colors";
import { useColorScheme } from "react-native";

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
  bookingUrl?: string;
}

// Local components removed in favor of SettingsUI

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
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");
  return (
    <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
      <View
        className={`pr-4 ${isFirst ? "pt-4 pb-3" : isLast ? "pt-3 pb-4" : "py-3"}`}
        style={{
          borderBottomWidth: !isLast ? 1 : 0,
          borderBottomColor: theme.borderSubtle,
        }}
      >
        <Text className="mb-2 text-[13px]" style={{ color: theme.textSecondary }}>
          {label}
        </Text>
        <TextInput
          className="rounded-lg px-3 py-2 text-[17px]"
          style={{
            backgroundColor: theme.backgroundMuted,
            color: theme.text,
            ...(multiline ? { height: 80, textAlignVertical: "top" } : undefined),
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A3A3A3"
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

// NavigationRow and SettingRow removed in favor of SettingsUI

export const BasicsTab: React.FC<BasicsTabProps> = (props) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");

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
        <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
          <View className="pr-4 pt-3 pb-4">
            <Text className="mb-2 text-[13px]" style={{ color: theme.textSecondary }}>
              URL
            </Text>
            <View
              className="flex-row items-center overflow-hidden rounded-lg"
              style={{ backgroundColor: theme.backgroundMuted }}
            >
              <Text
                className="px-3 py-2 text-[15px]"
                style={{ backgroundColor: theme.backgroundEmphasis, color: theme.textSecondary }}
              >
                {(() => {
                  // Parse bookingUrl to get domain prefix (e.g., "i.cal.com/" or "cal.com/username/")
                  if (props.bookingUrl) {
                    try {
                      const url = new URL(props.bookingUrl);
                      // Get path without the last segment (slug)
                      const pathParts = url.pathname.split("/").filter(Boolean);
                      pathParts.pop(); // Remove slug
                      // Compute prefix outside try/catch for React Compiler
                      let prefix = "/";
                      if (pathParts.length > 0) {
                        prefix = `/${pathParts.join("/")}/`;
                      }
                      return `${url.hostname}${prefix}`;
                    } catch {
                      // fallback
                    }
                  }
                  return `cal.com/${props.username}/`;
                })()}
              </Text>
              <TextInput
                className="flex-1 px-3 py-2 text-[17px]"
                style={{ color: theme.text }}
                value={props.eventSlug}
                onChangeText={(text) => props.setEventSlug(slugify(text, true))}
                placeholder="event-slug"
                placeholderTextColor="#A3A3A3"
              />
            </View>
          </View>
        </View>
      </SettingsGroup>

      {/* Duration */}
      <SettingsGroup header="Duration">
        {!props.allowMultipleDurations ? (
          <View
            className="bg-white pl-4"
            style={{ height: 52, backgroundColor: theme.backgroundSecondary }}
          >
            <View
              className="flex-row items-center justify-between pr-4"
              style={{ height: 52, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}
            >
              <Text className="text-[17px]" style={{ color: theme.text }}>
                Duration
              </Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-16 rounded-lg px-2 py-1.5 text-center text-[15px]"
                  style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                  value={props.eventDuration}
                  onChangeText={props.setEventDuration}
                  placeholder="30"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="numeric"
                />
                <Text className="text-[15px]" style={{ color: theme.textSecondary }}>
                  minutes
                </Text>
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
                options={props.selectedDurations.map((d) => ({ label: d, value: d }))}
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
