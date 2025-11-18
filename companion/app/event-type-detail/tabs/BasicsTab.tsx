import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SvgImage } from "../../../components/SvgImage";
import { defaultLocations, DefaultLocationType } from "../../../utils/defaultLocations";
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
  
  // Location
  selectedLocation: string;
  setShowLocationDropdown: (show: boolean) => void;
  conferencingLoading: boolean;
  getSelectedLocationIconUrl: () => string | null;
  locationAddress: string;
  setLocationAddress: (value: string) => void;
  locationLink: string;
  setLocationLink: (value: string) => void;
  locationPhone: string;
  setLocationPhone: (value: string) => void;
}

export function BasicsTab(props: BasicsTabProps) {
  return (
    <View className="gap-3">
      {/* Title and Description Card */}
      <View className="bg-white rounded-2xl p-5">
        <View className="mb-3">
          <Text className="text-base font-semibold text-[#333] mb-1.5">Title</Text>
          <TextInput
            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
            value={props.eventTitle}
            onChangeText={props.setEventTitle}
            placeholder="Enter event title"
            placeholderTextColor="#8E8E93"
          />
        </View>

        <View className="mb-3">
          <Text className="text-base font-semibold text-[#333] mb-1.5">Description</Text>
          <TextInput
            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
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
          <Text className="text-base font-semibold text-[#333] mb-1.5">URL</Text>
          <View className="flex-row items-center bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg overflow-hidden">
            <Text className="bg-[#E5E5EA] text-[#666] text-base px-3 py-3 rounded-tl-lg rounded-bl-lg">
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
      <View className="bg-white rounded-2xl p-5">
        {!props.allowMultipleDurations && (
          <View className="mb-3">
            <Text className="text-base font-semibold text-[#333] mb-1.5">Duration</Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
                value={props.eventDuration}
                onChangeText={props.setEventDuration}
                placeholder="30"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
              <Text className="text-base text-[#666]">Minutes</Text>
            </View>
          </View>
        )}

        {props.allowMultipleDurations && (
          <>
            <View className="mb-3">
              <Text className="text-base font-semibold text-[#333] mb-1.5">Available durations</Text>
              <TouchableOpacity
                className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                onPress={() => props.setShowDurationDropdown(true)}>
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

            {props.selectedDurations.length > 0 && (
              <View className="mb-3">
                <Text className="text-base font-semibold text-[#333] mb-1.5">Default duration</Text>
                <TouchableOpacity
                  className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
                  onPress={() => props.setShowDefaultDurationDropdown(true)}>
                  <Text className="text-base text-black">
                    {props.defaultDuration || "Select default duration"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View className="flex-row justify-between items-start">
          <Text className="text-base text-[#333] font-medium mb-1">Allow multiple durations</Text>
          <Switch
            value={props.allowMultipleDurations}
            onValueChange={props.setAllowMultipleDurations}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Location Card */}
      <View className="bg-white rounded-2xl p-5">
        <View className="mb-3">
          <Text className="text-base font-semibold text-[#333] mb-1.5">Location</Text>
          <TouchableOpacity
            className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
            onPress={() => props.setShowLocationDropdown(true)}
            disabled={props.conferencingLoading}>
            <View className="flex-row items-center flex-1">
              {!props.conferencingLoading && props.selectedLocation && props.getSelectedLocationIconUrl() && (
                <SvgImage
                  uri={props.getSelectedLocationIconUrl()!}
                  width={20}
                  height={20}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text className="text-base text-black">
                {props.conferencingLoading
                  ? "Loading locations..."
                  : props.selectedLocation || "Select location"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>

          {/* Location Input Fields - shown conditionally based on selected location type */}
          {(() => {
            const currentLocation = defaultLocations.find((loc) => loc.label === props.selectedLocation);
            if (!currentLocation || !currentLocation.organizerInputType) {
              return null;
            }

            if (currentLocation.organizerInputType === "text") {
              // Text input for address or link
              const isAddress = currentLocation.type === "inPerson";
              const isLink = currentLocation.type === "link";

              return (
                <View className="mt-3">
                  <Text className="text-sm font-medium text-[#333] mb-1.5">
                    {currentLocation.organizerInputLabel || (isAddress ? "Address" : "Meeting Link")}
                  </Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-4 py-3 text-base text-[#333]"
                    placeholder={currentLocation.organizerInputPlaceholder || ""}
                    value={isAddress ? props.locationAddress : props.locationLink}
                    onChangeText={(text) => {
                      if (isAddress) {
                        props.setLocationAddress(text);
                      } else {
                        props.setLocationLink(text);
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={isLink ? "url" : "default"}
                  />
                  {currentLocation.messageForOrganizer && (
                    <Text className="text-xs text-[#666] mt-2">
                      {currentLocation.messageForOrganizer}
                    </Text>
                  )}
                </View>
              );
            } else if (currentLocation.organizerInputType === "phone") {
              // Phone input
              return (
                <View className="mt-3">
                  <Text className="text-sm font-medium text-[#333] mb-1.5">
                    {currentLocation.organizerInputLabel || "Phone Number"}
                  </Text>
                  <TextInput
                    className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-4 py-3 text-base text-[#333]"
                    placeholder={currentLocation.organizerInputPlaceholder || "Enter phone number"}
                    value={props.locationPhone}
                    onChangeText={props.setLocationPhone}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="phone-pad"
                  />
                  {currentLocation.messageForOrganizer && (
                    <Text className="text-xs text-[#666] mt-2">{currentLocation.messageForOrganizer}</Text>
                  )}
                </View>
              );
            }
            return null;
          })()}
        </View>
      </View>
    </View>
  );
}

export default BasicsTab;
