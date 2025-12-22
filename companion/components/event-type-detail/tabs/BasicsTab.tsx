import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { LocationsList } from "../../../components/LocationsList";
import { LocationItem, LocationOptionGroup } from "../../../types/locations";
import { slugify } from "../../../utils/slugify";

interface BasicsTabProps {
  // Title, description, URL
  eventTitle: string;
  setEventTitle: (value: string) => void;
  eventDescription: string;
  setEventDescription: (value: string) => void;
  username: string;
  eventSlug: string;
  setEventSlug: (value: string) => void;

  // Duration
  allowMultipleDurations: boolean;
  setAllowMultipleDurations: (value: boolean) => void;
  eventDuration: string;
  setEventDuration: (value: string) => void;
  selectedDurations: string[];
  setShowDurationDropdown: (show: boolean) => void;
  defaultDuration: string;
  setShowDefaultDurationDropdown: (show: boolean) => void;

  // Multiple locations support
  locations: LocationItem[];
  onAddLocation: (location: LocationItem) => void;
  onRemoveLocation: (locationId: string) => void;
  onUpdateLocation: (locationId: string, updates: Partial<LocationItem>) => void;
  locationOptions: LocationOptionGroup[];
  conferencingLoading: boolean;
}

export function BasicsTab(props: BasicsTabProps) {
  return (
    <View className="gap-3">
      {/* Title and Description Card */}
      <View className="rounded-2xl bg-white p-5">
        <View className="mb-3">
          <Text className="mb-1.5 text-base font-semibold text-[#333]">Title</Text>
          <TextInput
            className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-black"
            value={props.eventTitle}
            onChangeText={props.setEventTitle}
            placeholder="Enter event title"
            placeholderTextColor="#8E8E93"
          />
        </View>

        <View className="mb-3">
          <Text className="mb-1.5 text-base font-semibold text-[#333]">Description</Text>
          <TextInput
            className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-black"
            style={{ height: 100, textAlignVertical: "top" }}
            value={props.eventDescription}
            onChangeText={props.setEventDescription}
            placeholder="Enter event description"
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={4}
          />
        </View>

        <View className="mb-3">
          <Text className="mb-1.5 text-base font-semibold text-[#333]">URL</Text>
          <View className="flex-row items-center overflow-hidden rounded-lg border border-[#E5E5EA] bg-[#F8F9FA]">
            <Text className="rounded-bl-lg rounded-tl-lg bg-[#E5E5EA] px-3 py-3 text-base text-[#666]">
              cal.com/{props.username}/
            </Text>
            <TextInput
              className="flex-1 px-3 py-3 text-base text-black"
              value={props.eventSlug}
              onChangeText={(text) => props.setEventSlug(slugify(text, true))}
              placeholder="event-slug"
              placeholderTextColor="#8E8E93"
            />
          </View>
        </View>
      </View>

      {/* Duration Card */}
      <View className="rounded-2xl bg-white p-5">
        {!props.allowMultipleDurations ? (
          <View className="mb-3">
            <Text className="mb-1.5 text-base font-semibold text-[#333]">Duration</Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
                value={props.eventDuration}
                onChangeText={props.setEventDuration}
                placeholder="30"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
              <Text className="text-base text-[#666]">Minutes</Text>
            </View>
          </View>
        ) : null}

        {props.allowMultipleDurations ? (
          <>
            <View className="mb-3">
              <Text className="mb-1.5 text-base font-semibold text-[#333]">
                Available durations
              </Text>
              <TouchableOpacity
                className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
                onPress={() => props.setShowDurationDropdown(true)}
              >
                <Text className="text-base text-black">
                  {props.selectedDurations.length > 0
                    ? `${props.selectedDurations.length} duration${
                        props.selectedDurations.length > 1 ? "s" : ""
                      } selected`
                    : "Select durations"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {props.selectedDurations.length > 0 ? (
              <View className="mb-3">
                <Text className="mb-1.5 text-base font-semibold text-[#333]">Default duration</Text>
                <TouchableOpacity
                  className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
                  onPress={() => props.setShowDefaultDurationDropdown(true)}
                >
                  <Text className="text-base text-black">
                    {props.defaultDuration || "Select default duration"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}

        <View className="flex-row items-start justify-between">
          <Text className="mb-1 text-base font-medium text-[#333]">Allow multiple durations</Text>
          <Switch
            value={props.allowMultipleDurations}
            onValueChange={props.setAllowMultipleDurations}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Location Card */}
      <View className="rounded-2xl bg-white p-5">
        <Text className="mb-3 text-base font-semibold text-[#333]">Locations</Text>
        <LocationsList
          locations={props.locations}
          onAdd={props.onAddLocation}
          onRemove={props.onRemoveLocation}
          onUpdate={props.onUpdateLocation}
          locationOptions={props.locationOptions}
          loading={props.conferencingLoading}
        />
      </View>
    </View>
  );
}
