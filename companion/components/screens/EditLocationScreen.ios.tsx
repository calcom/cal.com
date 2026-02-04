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
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdateLocation } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { safeLogError } from "@/utils/safeLogger";

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
  transparentBackground?: boolean;
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
  function EditLocationScreen(
    { booking, onSuccess, onSavingChange, transparentBackground = false },
    ref
  ) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const colors = {
      background: isDark ? "#000000" : "#F2F2F7",
      cardBackground: isDark ? "#171717" : "#FFFFFF",
      text: isDark ? "#FFFFFF" : "#000000",
      textSecondary: isDark ? "#A3A3A3" : "#6B7280",
      border: isDark ? "#4D4D4D" : "#E5E5EA",
      pill: isDark ? "#4D4D4D" : "#E8E8ED",
      inputBorder: isDark ? "rgba(56, 56, 58, 0.4)" : "rgba(209, 213, 219, 0.4)",
      inputBackground: isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
      accent: "#007AFF",
    };

    const [selectedType, setSelectedType] = useState<LocationTypeId>("link");
    const [inputValue, setInputValue] = useState("");

    // Use React Query mutation for automatic cache invalidation
    const { mutate: updateLocation, isPending: isSaving } = useUpdateLocation();

    // Detect location type from current location but don't pre-fill the input
    useEffect(() => {
      if (booking?.location) {
        const detectedType = detectLocationType(booking.location);
        setSelectedType(detectedType);
        // Don't pre-fill - keep input blank so user can enter new location
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

    const handleSubmit = useCallback(() => {
      if (!booking || isSaving) return;

      const trimmedValue = inputValue.trim();

      if (!trimmedValue) {
        showErrorAlert("Error", "Please enter a location");
        return;
      }

      // Validate phone number format
      if (selectedType === "phone") {
        if (!trimmedValue.startsWith("+")) {
          showErrorAlert(
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

      updateLocation(
        {
          uid: booking.uid,
          location: locationPayload,
        },
        {
          onSuccess: () => {
            showSuccessAlert("Success", "Location updated successfully");
            onSuccess();
          },
          onError: (error) => {
            safeLogError("[EditLocationScreen] Failed to update location:", error);
            showErrorAlert("Error", "Failed to update location. Please try again.");
          },
        }
      );
    }, [booking, selectedType, inputValue, onSuccess, isSaving, updateLocation]);

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
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: transparentBackground ? "transparent" : colors.background }}
        >
          <Text style={{ color: colors.textSecondary }}>No booking data</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
        style={{ backgroundColor: transparentBackground ? "transparent" : colors.background }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={!transparentBackground}
        >
          {transparentBackground ? (
            <>
              {/* Location Type Selector with Native Context Menu - Glass UI */}
              <View
                className="mb-4 flex-row items-center rounded-xl px-4 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBackground,
                }}
              >
                <View
                  className="mr-3 h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: isDark ? "rgba(0, 122, 255, 0.3)" : "rgba(0, 122, 255, 0.2)",
                  }}
                >
                  <Ionicons name={selectedTypeConfig.iconName} size={20} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-[17px] font-medium" style={{ color: colors.text }}>
                    {selectedTypeConfig.label}
                  </Text>
                  <Text className="mt-0.5 text-[13px]" style={{ color: colors.textSecondary }}>
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

              {/* Location Input - Glass UI */}
              <View
                className="mb-4 overflow-hidden rounded-xl"
                style={{
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBackground,
                }}
              >
                <TextInput
                  className={`px-4 py-3 text-[17px] ${
                    selectedTypeConfig.inputType === "multiline" ? "min-h-[100px]" : "h-[50px]"
                  }`}
                  style={{ color: colors.text }}
                  placeholder={selectedTypeConfig.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  value={inputValue}
                  onChangeText={setInputValue}
                  keyboardType={selectedTypeConfig.keyboardType}
                  multiline={selectedTypeConfig.inputType === "multiline"}
                  textAlignVertical={
                    selectedTypeConfig.inputType === "multiline" ? "top" : "center"
                  }
                  autoCapitalize={selectedType === "link" ? "none" : "sentences"}
                  autoCorrect={selectedType !== "link" && selectedType !== "phone"}
                  editable={!isSaving}
                />
              </View>
            </>
          ) : (
            <>
              {/* Current Location Info */}
              {booking.location && (
                <View
                  className="mb-4 flex-row items-start rounded-xl p-4"
                  style={{ backgroundColor: colors.cardBackground }}
                >
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.pill }}
                  >
                    <Ionicons name="location" size={20} color={colors.textSecondary} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-[13px] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      Current Location
                    </Text>
                    <Text
                      className="mt-0.5 text-[15px]"
                      style={{ color: colors.text }}
                      numberOfLines={2}
                    >
                      {booking.location}
                    </Text>
                  </View>
                </View>
              )}

              {/* Location Type Selector with Native Context Menu */}
              <Text
                className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Location Type
              </Text>
              <View
                className="mb-4 flex-row items-center rounded-xl px-4"
                style={{ backgroundColor: colors.cardBackground }}
              >
                <View
                  className="mr-3 h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: isDark ? "rgba(0, 122, 255, 0.2)" : "rgba(0, 122, 255, 0.1)",
                  }}
                >
                  <Ionicons name={selectedTypeConfig.iconName} size={20} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-[17px] font-medium" style={{ color: colors.text }}>
                    {selectedTypeConfig.label}
                  </Text>
                  <Text className="mt-0.5 text-[13px]" style={{ color: colors.textSecondary }}>
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
              <Text
                className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                {selectedTypeConfig.label}
              </Text>
              <View
                className="mb-4 overflow-hidden rounded-xl"
                style={{ backgroundColor: colors.cardBackground }}
              >
                <TextInput
                  className={`px-4 py-3 text-[17px] ${
                    selectedTypeConfig.inputType === "multiline" ? "min-h-[100px]" : "h-[50px]"
                  }`}
                  style={{ color: colors.text }}
                  placeholder={selectedTypeConfig.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  value={inputValue}
                  onChangeText={setInputValue}
                  keyboardType={selectedTypeConfig.keyboardType}
                  multiline={selectedTypeConfig.inputType === "multiline"}
                  textAlignVertical={
                    selectedTypeConfig.inputType === "multiline" ? "top" : "center"
                  }
                  autoCapitalize={selectedType === "link" ? "none" : "sentences"}
                  autoCorrect={selectedType !== "link" && selectedType !== "phone"}
                  editable={!isSaving}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

// Default export for React Native compatibility
export default EditLocationScreen;
