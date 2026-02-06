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

import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdateLocation } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { safeLogError } from "@/utils/safeLogger";

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
  transparentBackground?: boolean;
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
      borderLight: isDark ? "#2C2C2E" : "#F3F4F6",
      pill: isDark ? "#4D4D4D" : "#E8E8ED",
      pillTransparent: isDark ? "rgba(56, 56, 58, 0.5)" : "rgba(232, 232, 237, 0.5)",
      inputBorder: isDark ? "rgba(56, 56, 58, 0.4)" : "rgba(209, 213, 219, 0.4)",
      inputBackground: isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
      selectedBg: isDark ? "#1C3A5F" : "#EBF4FF",
      accent: "#007AFF",
      chevron: isDark ? "#636366" : "#9CA3AF",
    };

    const [selectedType, setSelectedType] = useState<LocationTypeId>("link");
    const [inputValue, setInputValue] = useState("");
    const [showTypePicker, setShowTypePicker] = useState(false);

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

    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    const selectedTypeConfig = LOCATION_TYPES[selectedType];

    const handleSubmit = useCallback(() => {
      if (!booking || isSaving) return;

      const trimmedValue = inputValue.trim();

      if (!trimmedValue) {
        showErrorAlert("Error", "Please enter a location");
        return;
      }

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
      <>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            {/* Current Location Info - hidden in transparent mode */}
            {!transparentBackground && booking.location && (
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
                  <Text className="text-[13px] font-medium" style={{ color: colors.textSecondary }}>
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

            {/* Location Type Selector */}
            {!transparentBackground && (
              <Text
                className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Location Type
              </Text>
            )}
            <TouchableOpacity
              className="mb-4 flex-row items-center rounded-xl px-4 py-3.5"
              style={{
                backgroundColor: transparentBackground
                  ? colors.inputBackground
                  : colors.cardBackground,
                borderWidth: transparentBackground ? 1 : 0,
                borderColor: colors.inputBorder,
              }}
              onPress={() => setShowTypePicker(true)}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: isDark ? "rgba(0, 122, 255, 0.3)" : "rgba(0, 122, 255, 0.15)",
                }}
              >
                <Ionicons name={selectedTypeConfig.iconName} size={22} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-[17px] font-medium" style={{ color: colors.text }}>
                  {selectedTypeConfig.label}
                </Text>
                <Text className="mt-0.5 text-[13px]" style={{ color: colors.textSecondary }}>
                  {selectedTypeConfig.description}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.chevron} />
            </TouchableOpacity>

            {/* Location Input */}
            {!transparentBackground && (
              <Text
                className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                {selectedTypeConfig.label}
              </Text>
            )}
            <View
              className="mb-4 overflow-hidden rounded-xl"
              style={{
                backgroundColor: transparentBackground
                  ? colors.inputBackground
                  : colors.cardBackground,
                borderWidth: transparentBackground ? 1 : 0,
                borderColor: colors.inputBorder,
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
                textAlignVertical={selectedTypeConfig.inputType === "multiline" ? "top" : "center"}
                autoCapitalize={selectedType === "link" ? "none" : "sentences"}
                autoCorrect={selectedType !== "link" && selectedType !== "phone"}
                editable={!isSaving}
              />
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
              className="max-h-[70%] w-[320px] overflow-hidden rounded-2xl"
              style={{ backgroundColor: colors.cardBackground }}
            >
              <View
                className="px-4 py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text
                  className="text-center text-[17px] font-semibold"
                  style={{ color: colors.text }}
                >
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
                      className="flex-row items-center px-4 py-3.5"
                      style={{ backgroundColor: isSelected ? colors.selectedBg : "transparent" }}
                      onPress={() => {
                        setSelectedType(item.id);
                        if (selectedType !== item.id) {
                          setInputValue("");
                        }
                        setShowTypePicker(false);
                      }}
                    >
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: isSelected
                            ? isDark
                              ? "rgba(0, 122, 255, 0.3)"
                              : "rgba(0, 122, 255, 0.2)"
                            : colors.pill,
                        }}
                      >
                        <Ionicons
                          name={item.iconName}
                          size={22}
                          color={isSelected ? colors.accent : colors.textSecondary}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[17px]"
                          style={{
                            fontWeight: isSelected ? "600" : "400",
                            color: isSelected ? colors.accent : colors.text,
                          }}
                        >
                          {item.label}
                        </Text>
                        <Text
                          className="mt-0.5 text-[13px]"
                          style={{ color: colors.textSecondary }}
                        >
                          {item.description}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={22} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                className="py-3"
                style={{ borderTopWidth: 1, borderTopColor: colors.border }}
                onPress={() => setShowTypePicker(false)}
              >
                <Text
                  className="text-center text-[17px] font-semibold"
                  style={{ color: colors.accent }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }
);

export default EditLocationScreen;
