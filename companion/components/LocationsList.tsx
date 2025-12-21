/**
 * LocationsList Component
 * Reusable component for displaying and managing multiple event type locations
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  ActionSheetIOS,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SvgImage } from "./SvgImage";
import { LocationItem, LocationOptionGroup } from "../types/locations";
import {
  locationRequiresInput,
  getLocationInputPlaceholder,
  getLocationInputLabel,
  createLocationItemFromOption,
} from "../utils/locationHelpers";

interface LocationsListProps {
  /** Array of current locations */
  locations: LocationItem[];
  /** Callback when a location is added */
  onAdd: (location: LocationItem) => void;
  /** Callback when a location is removed */
  onRemove: (locationId: string) => void;
  /** Callback when a location is updated (for input fields) */
  onUpdate: (locationId: string, updates: Partial<LocationItem>) => void;
  /** Available location options grouped by category */
  locationOptions: LocationOptionGroup[];
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether locations are loading */
  loading?: boolean;
}

function isLocationAlreadyAdded(locations: LocationItem[], optionValue: string): boolean {
  return locations.some((loc) => {
    if (loc.type === "integration" && optionValue.startsWith("integrations:")) {
      return loc.integration === optionValue.replace("integrations:", "");
    }
    if (["address", "link", "phone"].includes(loc.type)) {
      return false;
    }
    return loc.type === optionValue;
  });
}

export const LocationsList: React.FC<LocationsListProps> = ({
  locations,
  onAdd,
  onRemove,
  onUpdate,
  locationOptions,
  disabled = false,
  loading = false,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddLocation = () => {
    if (Platform.OS === "ios") {
      const allOptions: Array<{ label: string; value: string }> = [];
      locationOptions.forEach((group) => {
        group.options.forEach((option) => {
          if (!isLocationAlreadyAdded(locations, option.value)) {
            allOptions.push({ label: option.label, value: option.value });
          }
        });
      });

      const options = [...allOptions.map((o) => o.label), "Cancel"];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: "Add Location",
        },
        (buttonIndex) => {
          if (buttonIndex !== options.length - 1 && buttonIndex < allOptions.length) {
            const selected = allOptions[buttonIndex];
            const newLocation = createLocationItemFromOption(selected.value, selected.label);
            onAdd(newLocation);
          }
        }
      );
    } else {
      setShowAddModal(true);
    }
  };

  const handleSelectOption = (optionValue: string, optionLabel: string) => {
    const newLocation = createLocationItemFromOption(optionValue, optionLabel);
    onAdd(newLocation);
    setShowAddModal(false);
  };

  const renderLocationIcon = (location: LocationItem) => {
    if (location.iconUrl) {
      return <SvgImage uri={location.iconUrl} width={20} height={20} style={{ marginRight: 12 }} />;
    }
    return (
      <View style={{ marginRight: 12 }}>
        <Ionicons name="location-outline" size={20} color="#6B7280" />
      </View>
    );
  };

  const renderLocationInput = (location: LocationItem) => {
    if (!locationRequiresInput(location.type)) {
      return null;
    }

    const placeholder = getLocationInputPlaceholder(location.type);
    const label = getLocationInputLabel(location.type);

    let value = "";
    let fieldKey: "address" | "link" | "phone" = "address";

    switch (location.type) {
      case "address":
        value = location.address || "";
        fieldKey = "address";
        break;
      case "link":
        value = location.link || "";
        fieldKey = "link";
        break;
      case "phone":
        value = location.phone || "";
        fieldKey = "phone";
        break;
    }

    return (
      <View className="mt-2">
        <Text className="mb-1 text-xs text-gray-500">{label}</Text>
        <TextInput
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => onUpdate(location.id, { [fieldKey]: text })}
          editable={!disabled}
          keyboardType={location.type === "phone" ? "phone-pad" : "default"}
          autoCapitalize={location.type === "link" ? "none" : "sentences"}
        />
      </View>
    );
  };

  return (
    <View>
      {/* Locations List */}
      {locations.length > 0 ? (
        <View className="mb-3 space-y-2">
          {locations.map((location, index) => (
            <View key={location.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center">
                  {renderLocationIcon(location)}
                  <Text className="flex-1 text-base text-gray-900" numberOfLines={1}>
                    {location.displayName}
                  </Text>
                </View>
                {!disabled ? (
                  <TouchableOpacity
                    onPress={() => onRemove(location.id)}
                    className="ml-2 p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
              {renderLocationInput(location)}
            </View>
          ))}
        </View>
      ) : (
        <View className="mb-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <Text className="text-center text-sm text-gray-500">No locations added yet</Text>
        </View>
      )}

      {/* Add Location Button */}
      <TouchableOpacity
        onPress={handleAddLocation}
        disabled={disabled || loading}
        className={`flex-row items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 ${
          disabled ? "opacity-50" : "active:bg-gray-100"
        }`}
      >
        {loading ? (
          <Text className="text-sm text-gray-500">Loading options...</Text>
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color="#6B7280" />
            <Text className="ml-2 text-sm font-medium text-gray-600">Add Location</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Add Location Modal (for non-iOS) */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-3xl bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
              <Text className="text-lg font-semibold text-gray-900">Add Location</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView className="px-4 py-2">
              {locationOptions.map((group, groupIndex) => (
                <View key={group.category} className={groupIndex > 0 ? "mt-4" : ""}>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.category}
                  </Text>
                  {group.options.map((option) => {
                    const alreadyAdded = isLocationAlreadyAdded(locations, option.value);

                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => handleSelectOption(option.value, option.label)}
                        disabled={alreadyAdded}
                        className={`flex-row items-center rounded-lg px-2 py-3 ${
                          alreadyAdded ? "opacity-40" : "active:bg-gray-100"
                        }`}
                      >
                        {option.iconUrl ? (
                          <SvgImage
                            uri={option.iconUrl}
                            width={24}
                            height={24}
                            style={{ marginRight: 12 }}
                          />
                        ) : (
                          <View style={{ marginRight: 12 }}>
                            <Ionicons name="location-outline" size={24} color="#6B7280" />
                          </View>
                        )}
                        <Text className="flex-1 text-base text-gray-900">{option.label}</Text>
                        {alreadyAdded && <Ionicons name="checkmark" size={20} color="#10B981" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              {/* Bottom padding for safe area */}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
