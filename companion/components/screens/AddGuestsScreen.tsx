/**
 * AddGuestsScreen Component
 *
 * Screen content for adding guests to a booking.
 * Used with the add-guests route that has native Stack.Header.
 */

import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAddGuests } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { safeLogError } from "@/utils/safeLogger";
import { getColors } from "@/constants/colors";

export interface AddGuestsScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  onGuestCountChange?: (count: number) => void;
  transparentBackground?: boolean;
}

// Handle type for parent component to call submit
export interface AddGuestsScreenHandle {
  submit: () => void;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export const AddGuestsScreen = forwardRef<AddGuestsScreenHandle, AddGuestsScreenProps>(
  function AddGuestsScreen(
    { booking, onSuccess, onSavingChange, onGuestCountChange, transparentBackground = false },
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
      borderLight: isDark ? "#2C2C2E" : "rgba(243, 244, 246, 0.5)",
      pill: isDark ? "#4D4D4D" : "#E8E8ED",
      pillTransparent: isDark ? "rgba(56, 56, 58, 0.5)" : "rgba(232, 232, 237, 0.5)",
      inputBorder: isDark ? "rgba(56, 56, 58, 0.4)" : "rgba(209, 213, 219, 0.4)",
      inputBackground: isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
      accent: "#007AFF",
      destructive: getColors(isDark).destructive,
    };

    // Derive styles from colors and props
    const backgroundStyle = transparentBackground ? "" : `bg-[${colors.background}]`;
    const pillStyle = transparentBackground ? "bg-gray-200/50" : `bg-[${colors.pill}]`;

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [guests, setGuests] = useState<{ email: string; name?: string }[]>([]);

    // Use React Query mutation for automatic cache invalidation
    const { mutate: addGuestsMutation, isPending: isSaving } = useAddGuests();

    // Notify parent of saving state changes
    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    // Notify parent of guest count changes
    useEffect(() => {
      onGuestCountChange?.(guests.length);
    }, [guests.length, onGuestCountChange]);

    const handleAddGuest = useCallback(() => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        showErrorAlert("Error", "Please enter an email address");
        return;
      }

      if (!isValidEmail(trimmedEmail)) {
        showErrorAlert("Error", "Please enter a valid email address");
        return;
      }

      if (guests.some((g) => g.email.toLowerCase() === trimmedEmail.toLowerCase())) {
        showErrorAlert("Error", "This guest has already been added");
        return;
      }

      setGuests([...guests, { email: trimmedEmail, name: name.trim() || undefined }]);
      setEmail("");
      setName("");
    }, [email, name, guests]);

    const handleRemoveGuest = useCallback(
      (index: number) => {
        setGuests(guests.filter((_, i) => i !== index));
      },
      [guests]
    );

    const handleSubmit = useCallback(() => {
      if (!booking || isSaving) return;

      if (guests.length === 0) {
        showErrorAlert("Error", "Please add at least one guest");
        return;
      }

      addGuestsMutation(
        {
          uid: booking.uid,
          guests,
        },
        {
          onSuccess: () => {
            if (Platform.OS === "web") {
              showSuccessAlert("Success", "Guests added successfully");
              onSuccess();
            } else {
              Alert.alert("Success", "Guests added successfully", [
                { text: "OK", onPress: onSuccess },
              ]);
            }
          },
          onError: (error) => {
            safeLogError("[AddGuestsScreen] Failed to add guests:", error);
            showErrorAlert("Error", "Failed to add guests. Please try again.");
          },
        }
      );
    }, [booking, guests, onSuccess, isSaving, addGuestsMutation]);

    // Expose submit function to parent via ref (same pattern as senior's actionHandlersRef)
    useImperativeHandle(
      ref,
      () => ({
        submit: handleSubmit,
      }),
      [handleSubmit]
    );

    if (!booking) {
      return (
        <View className={`flex-1 items-center justify-center ${backgroundStyle}`}>
          <Text className="text-gray-500">No booking data</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className={`flex-1 ${backgroundStyle}`}
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
          {/* Email input */}
          {transparentBackground && (
            <Text className="mb-2 px-1 text-[13px] font-medium text-[#A3A3A3]">Email *</Text>
          )}
          <View
            className={`mb-3 overflow-hidden rounded-xl px-4 py-3 ${
              transparentBackground
                ? isDark
                  ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                  : "border border-gray-300/40 bg-white/60"
                : isDark
                  ? "bg-[#171717]"
                  : "bg-white"
            }`}
          >
            {!transparentBackground && (
              <Text
                className={`mb-1.5 text-[13px] font-medium ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}
              >
                Email *
              </Text>
            )}
            <TextInput
              className={`h-10 text-[17px] ${isDark ? "text-white" : "text-[#000]"}`}
              placeholder="guest@example.com"
              placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
            />
          </View>

          {/* Name input */}
          {transparentBackground && (
            <Text className="mb-2 px-1 text-[13px] font-medium text-[#A3A3A3]">
              Name (optional)
            </Text>
          )}
          <View
            className={`mb-4 overflow-hidden rounded-xl px-4 py-3 ${
              transparentBackground
                ? isDark
                  ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                  : "border border-gray-300/40 bg-white/60"
                : isDark
                  ? "bg-[#171717]"
                  : "bg-white"
            }`}
          >
            {!transparentBackground && (
              <Text
                className={`mb-1.5 text-[13px] font-medium ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}
              >
                Name (optional)
              </Text>
            )}
            <TextInput
              className={`h-10 text-[17px] ${isDark ? "text-white" : "text-[#000]"}`}
              placeholder="Guest Name"
              placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
              value={name}
              onChangeText={setName}
              editable={!isSaving}
            />
          </View>

          {/* Add button */}
          <TouchableOpacity
            className={`mb-6 flex-row items-center justify-center rounded-xl py-3 ${
              transparentBackground
                ? isDark
                  ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                  : "border border-gray-300/40 bg-white/60"
                : isDark
                  ? "bg-[#171717]"
                  : "bg-white"
            }`}
            onPress={handleAddGuest}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <Ionicons name="add-circle" size={22} color="#007AFF" />
            <Text className="ml-2 text-[17px] font-medium text-[#007AFF]">Add</Text>
          </TouchableOpacity>

          {/* Guest list */}
          {guests.length > 0 && (
            <View>
              <Text
                className={`mb-2 px-1 text-[13px] font-medium uppercase tracking-wide ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}
              >
                Guests to add ({guests.length})
              </Text>
              <View
                className={`overflow-hidden rounded-xl ${
                  transparentBackground
                    ? isDark
                      ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                      : "border border-gray-300/40 bg-white/60"
                    : isDark
                      ? "bg-[#171717]"
                      : "bg-white"
                }`}
              >
                {guests.map((guest, index) => (
                  <View
                    key={guest.email}
                    className={`flex-row items-center px-4 py-3 ${
                      index < guests.length - 1
                        ? isDark
                          ? "border-b border-[#4D4D4D]/50"
                          : "border-b border-gray-100/50"
                        : ""
                    }`}
                  >
                    <View
                      className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${pillStyle}`}
                    >
                      <Ionicons name="person" size={20} color={isDark ? "#A3A3A3" : "#6B7280"} />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-[17px] ${isDark ? "text-white" : "text-[#000]"}`}>
                        {guest.email}
                      </Text>
                      {guest.name && (
                        <Text
                          className={`mt-0.5 text-[15px] ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}
                        >
                          {guest.name}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveGuest(index)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={isSaving}
                    >
                      <Ionicons name="close-circle-outline" size={24} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

// Default export for React Native compatibility
export default AddGuestsScreen;
