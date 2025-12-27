/**
 * EditLocationScreen Component (iOS)
 *
 * iOS-specific implementation with native context menu for location type selection.
 * Uses @expo/ui/swift-ui ContextMenu for the glass UI feel.
 */

import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Booking } from "../../services/calcom";
import { CalComAPIService } from "../../services/calcom";

// Location types configuration
export const LOCATION_TYPES = {
  link: {
    id: "link",
    label: "Meeting Link",
    description: "Video call URL or web link",
    iconName: "link" as const,
    sfSymbol: "link" as const,
    placeholder: "https://meet.example.com/your-meeting",
    keyboardType: "url" as const,
    inputType: "single" as const,
  },
  phone: {
    id: "phone",
    label: "Phone Call",
    description: "Phone number for the meeting",
    iconName: "call" as const,
    sfSymbol: "phone" as const,
    placeholder: "+1 234-567-8900 (include country code)",
    keyboardType: "phone-pad" as const,
    inputType: "single" as const,
  },
  address: {
    id: "address",
    label: "Location / Other",
    description: "Address, place, or custom text",
    iconName: "location" as const,
    sfSymbol: "mappin.and.ellipse" as const,
    placeholder: "Enter address or location details",
    keyboardType: "default" as const,
    inputType: "multiline" as const,
  },
} as const;

export type LocationTypeId = keyof typeof LOCATION_TYPES;

export interface EditLocationScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
}

// Handle type for parent component to call submit
export interface EditLocationScreenHandle {
  submit: () => void;
}

// Helper to detect location type from existing location string
const detectLocationType = (location: string): LocationTypeId => {
  if (!location) return "link";

  // Check if it's a URL
  if (
    location.startsWith("http://") ||
    location.startsWith("https://") ||
    location.startsWith("www.")
  ) {
    return "link";
  }

  // Check if it looks like a phone number
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  if (phoneRegex.test(location.replace(/\s/g, ""))) {
    return "phone";
  }

  // Default to address for other text
  return "address";
};

export const EditLocationScreen = forwardRef<EditLocationScreenHandle, EditLocationScreenProps>(
  function EditLocationScreen({ booking, onSuccess, onSavingChange }, ref) {
    const insets = useSafeAreaInsets();
    const [selectedType, setSelectedType] = useState<LocationTypeId>("link");
    const [inputValue, setInputValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill with current location
    useEffect(() => {
      if (booking?.location) {
        const detectedType = detectLocationType(booking.location);
        setSelectedType(detectedType);
        setInputValue(booking.location);
      }
    }, [booking?.location]);

    // Notify parent of saving state changes
    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    const selectedTypeConfig = LOCATION_TYPES[selectedType];

    const handleTypeSelect = useCallback(
      (type: LocationTypeId) => {
        if (selectedType !== type) {
          setInputValue("");
        }
        setSelectedType(type);
      },
      [selectedType]
    );

    const handleSubmit = useCallback(async () => {
      if (!booking) return;

      const trimmedValue = inputValue.trim();

      if (!trimmedValue) {
        Alert.alert("Error", "Please enter a location");
        return;
      }

      // Validate phone number format
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

    // Expose submit function to parent via ref
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
      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-[#F2F2F7]">
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

          {/* Location Type Selector with Native Context Menu */}
          <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-gray-500">
            Location Type
          </Text>
          <View className="mb-4 flex-row items-center rounded-xl bg-white px-4">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-[#007AFF]/10">
              <Ionicons name={selectedTypeConfig.iconName} size={20} color="#007AFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-medium text-[#000]">
                {selectedTypeConfig.label}
              </Text>
              <Text className="mt-0.5 text-[13px] text-gray-500">
                {selectedTypeConfig.description}
              </Text>
            </View>

            {/* Native iOS Context Menu Button */}
            <Host matchContents>
              <ContextMenu
                modifiers={[
                  buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"),
                  padding(),
                ]}
                activationMethod="singlePress"
              >
                <ContextMenu.Items>
                  <Button
                    systemImage={LOCATION_TYPES.link.sfSymbol}
                    onPress={() => handleTypeSelect("link")}
                    label={LOCATION_TYPES.link.label}
                  />
                  <Button
                    systemImage={LOCATION_TYPES.phone.sfSymbol}
                    onPress={() => handleTypeSelect("phone")}
                    label={LOCATION_TYPES.phone.label}
                  />
                  <Button
                    systemImage={LOCATION_TYPES.address.sfSymbol}
                    onPress={() => handleTypeSelect("address")}
                    label={LOCATION_TYPES.address.label}
                  />
                </ContextMenu.Items>
                <ContextMenu.Trigger>
                  <HStack>
                    <Image
                      systemName="ellipsis"
                      color="primary"
                      size={20}
                      modifiers={[frame({ height: 18, width: 18 })]}
                    />
                  </HStack>
                </ContextMenu.Trigger>
              </ContextMenu>
            </Host>
          </View>

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
              Updating the location will notify attendees. Note: Calendar events may not be updated
              automatically.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

// Default export for React Native compatibility
export default EditLocationScreen;
