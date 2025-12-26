/**
 * EditLocationScreen Component (Android/Web)
 *
 * Screen content for editing the location of a booking.
 * Uses a dropdown modal for location type selection on Android/Web.
 * iOS uses a native header menu via EditLocationScreen.ios.tsx
 *
 * Note: The API currently only supports these location types:
 * - address (physical address)
 * - link (custom meeting URL)
 * - phone (phone number)
 *
 * Integration-based locations (Cal Video, Google Meet, Zoom) are NOT
 * supported for updating existing bookings via the current API.
 */
import type { Booking } from "../../services/calcom";
import { CalComAPIService } from "../../services/calcom";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const LOCATION_TYPES = {
  link: {
    id: "link" as const,
    label: "Meeting Link",
    description: "Video call URL or web link",
    iconName: "link" as const,
    sfSymbol: "link" as const,
    placeholder: "https://meet.example.com/your-meeting",
    keyboardType: "url" as const,
    inputType: "single" as const,
  },
  phone: {
    id: "phone" as const,
    label: "Phone Call",
    description: "Phone number for the meeting",
    iconName: "call" as const,
    sfSymbol: "phone" as const,
    placeholder: "+1 234-567-8900 (include country code)",
    keyboardType: "phone-pad" as const,
    inputType: "single" as const,
  },
  address: {
    id: "address" as const,
    label: "Location / Other",
    description: "Address, place, or custom text",
    iconName: "location" as const,
    sfSymbol: "mappin.and.ellipse" as const,
    placeholder: "Enter address or location details",
    keyboardType: "default" as const,
    inputType: "multiline" as const,
  },
} as const;

const LOCATION_TYPES_ARRAY = Object.values(LOCATION_TYPES);

export type LocationTypeId = keyof typeof LOCATION_TYPES;

export interface EditLocationScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  selectedType?: LocationTypeId;
  onTypeChange?: (type: LocationTypeId) => void;
}

export interface EditLocationScreenHandle {
  submit: () => void;
}

const detectLocationType = (location: string): LocationTypeId => {
  if (!location) return "link";

  if (
    location.startsWith("http://") ||
    location.startsWith("https://") ||
    location.startsWith("www.")
  ) {
    return "link";
  }

  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  if (phoneRegex.test(location.replace(/\s/g, ""))) {
    return "phone";
  }

  return "address";
};

export const EditLocationScreen = forwardRef<EditLocationScreenHandle, EditLocationScreenProps>(
  function EditLocationScreen({ booking, onSuccess, onSavingChange }, ref) {
    const insets = useSafeAreaInsets();
    const [selectedType, setSelectedType] = useState<LocationTypeId>("link");
    const [inputValue, setInputValue] = useState("");
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      if (booking?.location) {
        const detectedType = detectLocationType(booking.location);
        setSelectedType(detectedType);
        setInputValue(booking.location);
      }
    }, [booking?.location]);

    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    const selectedTypeConfig = LOCATION_TYPES[selectedType];

    const handleSubmit = useCallback(async () => {
      if (!booking) return;

      const trimmedValue = inputValue.trim();

      if (!trimmedValue) {
        Alert.alert("Error", "Please enter a location");
        return;
      }

      if (selectedType === "phone") {
        if (!trimmedValue.startsWith("+")) {
          Alert.alert(
            "Invalid Phone Number",
            "Phone number must include country code (e.g., +1 234-567-8900)"
          );
          return;
        }
      }

      // Build the location payload based on type
      let locationPayload: { type: string; [key: string]: string };

      switch (selectedType) {
        case "link":
          locationPayload = { type: "link", link: trimmedValue };
          break;
        case "phone":
          locationPayload = { type: "phone", phone: trimmedValue };
          break;
        case "address":
        default:
          locationPayload = { type: "address", address: trimmedValue };
      }

      setIsSaving(true);
      try {
        await CalComAPIService.updateLocationV2(booking.uid, locationPayload);
        Alert.alert("Success", "Location updated successfully", [
          { text: "OK", onPress: onSuccess },
        ]);
      } catch (error) {
        console.error("[EditLocationScreen] Failed to update location:", error);
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to update location");
      } finally {
        setIsSaving(false);
      }
    }, [booking, selectedType, inputValue, onSuccess]);

    useImperativeHandle(
      ref,
      () => ({
        submit: handleSubmit,
      }),
      [handleSubmit]
    );

    if (!booking) {
      return (
        <View className="flex-1 items-center justify-center bg-[#F2F2F7]">
          <Text className="text-gray-500">No booking data</Text>
        </View>
      );
    }

    return (
      <>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-[#F2F2F7]"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Location Info */}
            {booking.location && (
              <View className="mb-4 flex-row items-start rounded-xl bg-white p-4">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#E8E8ED]">
                  <Ionicons name="location" size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-medium text-gray-500">Current Location</Text>
                  <Text className="mt-0.5 text-[15px] text-[#000]" numberOfLines={2}>
                    {booking.location}
                  </Text>
                </View>
              </View>
            )}

            {/* Location Type Selector */}
            <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-gray-500">
              Location Type
            </Text>
            <TouchableOpacity
              className="mb-4 flex-row items-center rounded-xl bg-white px-4 py-3.5"
              onPress={() => setShowTypePicker(true)}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-[#007AFF]/10">
                <Ionicons name={selectedTypeConfig.iconName} size={22} color="#007AFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[17px] font-medium text-[#000]">
                  {selectedTypeConfig.label}
                </Text>
                <Text className="mt-0.5 text-[13px] text-gray-500">
                  {selectedTypeConfig.description}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Location Input */}
            <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-gray-500">
              {selectedTypeConfig.label}
            </Text>
            <View className="mb-4 overflow-hidden rounded-xl bg-white">
              <TextInput
                className={`px-4 py-3 text-[17px] text-[#000] ${
                  selectedTypeConfig.inputType === "multiline" ? "min-h-[100px]" : "h-[50px]"
                }`}
                placeholder={selectedTypeConfig.placeholder}
                placeholderTextColor="#9CA3AF"
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType={selectedTypeConfig.keyboardType}
                multiline={selectedTypeConfig.inputType === "multiline"}
                textAlignVertical={selectedTypeConfig.inputType === "multiline" ? "top" : "center"}
                autoCapitalize={selectedType === "link" ? "none" : "sentences"}
                autoCorrect={selectedType !== "link" && selectedType !== "phone"}
                editable={!isSaving}
              />
            </View>

            {/* Info note */}
            <View className="flex-row items-start rounded-xl bg-[#E3F2FD] p-4">
              <Ionicons name="information-circle" size={20} color="#1976D2" />
              <Text className="ml-3 flex-1 text-[15px] leading-5 text-[#1565C0]">
                Updating the location will notify attendees. Note: Calendar events may not be
                updated automatically.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Location Type Picker Modal */}
        <Modal
          visible={showTypePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTypePicker(false)}
        >
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/50"
            activeOpacity={1}
            onPress={() => setShowTypePicker(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              className="max-h-[70%] w-[320px] overflow-hidden rounded-2xl bg-white"
            >
              <View className="border-b border-gray-200 px-4 py-3">
                <Text className="text-center text-[17px] font-semibold text-[#000]">
                  Select Location Type
                </Text>
              </View>
              <FlatList
                data={LOCATION_TYPES_ARRAY}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedType;
                  return (
                    <TouchableOpacity
                      className={`flex-row items-center px-4 py-3.5 ${
                        isSelected ? "bg-[#EBF4FF]" : ""
                      }`}
                      onPress={() => {
                        setSelectedType(item.id);
                        if (selectedType !== item.id) {
                          setInputValue("");
                        }
                        setShowTypePicker(false);
                      }}
                    >
                      <View
                        className={`mr-3 h-10 w-10 items-center justify-center rounded-lg ${
                          isSelected ? "bg-[#007AFF]/20" : "bg-[#F2F2F7]"
                        }`}
                      >
                        <Ionicons
                          name={item.iconName}
                          size={22}
                          color={isSelected ? "#007AFF" : "#6B7280"}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-[17px] ${
                            isSelected ? "font-semibold text-[#007AFF]" : "text-[#000]"
                          }`}
                        >
                          {item.label}
                        </Text>
                        <Text className="mt-0.5 text-[13px] text-gray-500">{item.description}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={22} color="#007AFF" />}
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                className="border-t border-gray-200 py-3"
                onPress={() => setShowTypePicker(false)}
              >
                <Text className="text-center text-[17px] font-semibold text-[#007AFF]">Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }
);

export default EditLocationScreen;
