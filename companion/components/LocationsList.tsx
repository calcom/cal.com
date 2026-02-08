/**
 * LocationsList Component
 * Reusable component for displaying and managing multiple event type locations
 */

import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import type { LocationItem, LocationOptionGroup } from "@/types/locations";
import {
  createLocationItemFromOption,
  getLocationInputLabel,
  getLocationInputPlaceholder,
  locationRequiresInput,
} from "@/utils/locationHelpers";
import { LocationsListIOSPicker } from "./LocationsListIOSPicker";
import { SvgImage } from "./SvgImage";

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
  /** Whether to hide the internal add button */
  hideAddButton?: boolean;
  /** External control for the add modal */
  showAddModal?: boolean;
  /** Callback to change modal visibility */
  onShowAddModalChange?: (visible: boolean) => void;
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

export const AddLocationTrigger = ({
  isHeader = false,
  locationOptions,
  locations,
  onSelectOption,
  disabled = false,
  loading = false,
  onPressFallback,
}: {
  isHeader?: boolean;
  locationOptions: LocationOptionGroup[];
  locations: LocationItem[];
  onSelectOption: (value: string, label: string) => void;
  disabled?: boolean;
  loading?: boolean;
  onPressFallback?: () => void;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const trigger = isHeader ? (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={Platform.OS !== "ios" ? onPressFallback : undefined}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      className="flex-row items-center rounded-full border border-[#E5E5E5] bg-[#F2F2F7] p-1 dark:border-[#4D4D4D] dark:bg-[#262626]"
    >
      <Ionicons name="add" size={18} color={isDark ? "#FFFFFF" : "#000000"} />
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={Platform.OS !== "ios" ? onPressFallback : undefined}
      className={`flex-row items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 dark:border-[#4D4D4D] dark:bg-[#262626] ${
        disabled ? "opacity-50" : "active:bg-gray-100 dark:active:bg-[#171717]"
      }`}
    >
      {loading ? (
        <Text className="text-sm text-gray-500 dark:text-[#A3A3A3]">Loading options...</Text>
      ) : (
        <>
          <Ionicons name="add-circle-outline" size={20} color="#6B7280" />
          <Text className="ml-2 text-sm font-medium text-gray-600 dark:text-[#A3A3A3]">
            Add Location
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  if (Platform.OS !== "ios") {
    return trigger;
  }

  const iosPicker = (
    <LocationsListIOSPicker
      isHeader={isHeader}
      locationOptions={locationOptions}
      locations={locations}
      onSelectOption={onSelectOption}
      trigger={trigger}
    />
  );

  return iosPicker ?? trigger;
};

export const LocationsList: React.FC<LocationsListProps> = ({
  locations,
  onAdd,
  onRemove,
  onUpdate,
  locationOptions,
  disabled = false,
  loading = false,
  hideAddButton = false,
  showAddModal: controlledShowAddModal,
  onShowAddModalChange,
}) => {
  const [internalShowAddModal, setInternalShowAddModal] = useState(false);
  const showAddModal = controlledShowAddModal ?? internalShowAddModal;
  const setShowAddModal = onShowAddModalChange ?? setInternalShowAddModal;

  const handleAddLocation = () => {
    setShowAddModal(true);
  };

  const handleSelectOption = (optionValue: string, optionLabel: string) => {
    const newLocation = createLocationItemFromOption(optionValue, optionLabel);
    onAdd(newLocation);
    setShowAddModal(false);
  };

  const renderLocationIcon = (location: LocationItem) => {
    if (location.iconUrl) {
      return (
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#F2F2F7] dark:bg-[#262626]">
          <SvgImage uri={location.iconUrl} width={20} height={20} />
        </View>
      );
    }
    return (
      <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#F2F2F7] dark:bg-[#262626]">
        <Ionicons name="location" size={18} color="#000000" />
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
        <Text className="mb-1 text-[13px] text-[#6D6D72] dark:text-[#A3A3A3]">{label}</Text>
        <TextInput
          className="rounded-lg bg-[#F2F2F7] px-3 py-2 text-[17px] text-black dark:bg-[#262626] dark:text-white"
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
    <View className="bg-white dark:bg-[#171717]">
      {/* Locations List */}
      {locations.length > 0 ? (
        <View className="mb-2">
          {locations.map((location, index) => (
            <View
              key={location.id}
              className={`pl-4 ${
                index !== locations.length - 1
                  ? "border-b border-[#E5E5E5] dark:border-[#4D4D4D]"
                  : ""
              }`}
            >
              <View
                className={`pr-4 ${
                  index === 0 ? "pt-4 pb-3" : index === locations.length - 1 ? "pt-3 pb-4" : "py-3"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    {renderLocationIcon(location)}
                    <Text
                      className="flex-1 text-[17px] text-black font-normal dark:text-white"
                      numberOfLines={1}
                    >
                      {location.displayName}
                    </Text>
                  </View>
                  {!disabled ? (
                    <TouchableOpacity
                      onPress={() => onRemove(location.id)}
                      className="ml-2"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {renderLocationInput(location)}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Add Location Button */}
      {!hideAddButton && (
        <View className="pb-2 pt-1 items-center justify-center">
          <AddLocationTrigger
            locationOptions={locationOptions}
            locations={locations}
            onSelectOption={handleSelectOption}
            onPressFallback={handleAddLocation}
            disabled={disabled}
            loading={loading}
          />
        </View>
      )}

      {/* Add Location Modal (for non-iOS) */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-3xl bg-white dark:bg-[#171717]">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-[#4D4D4D]">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Location
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView className="px-4 py-2">
              {locationOptions.map((group, groupIndex) => (
                <View key={group.category} className={groupIndex > 0 ? "mt-4" : ""}>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#A3A3A3]">
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
                          alreadyAdded
                            ? "opacity-40"
                            : "active:bg-gray-100 dark:active:bg-[#262626]"
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
                        <Text className="flex-1 text-base text-gray-900 dark:text-white">
                          {option.label}
                        </Text>
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
