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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Booking } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import { safeLogError } from "@/utils/safeLogger";

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
    const backgroundStyle = transparentBackground ? "bg-transparent" : "bg-[#F2F2F7]";
    const pillStyle = transparentBackground ? "bg-[#E8E8ED]/50" : "bg-[#E8E8ED]";
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [guests, setGuests] = useState<{ email: string; name?: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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
        Alert.alert("Error", "Please enter an email address");
        return;
      }

      if (!isValidEmail(trimmedEmail)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }

      if (guests.some((g) => g.email.toLowerCase() === trimmedEmail.toLowerCase())) {
        Alert.alert("Error", "This guest has already been added");
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

    const handleSubmit = useCallback(async () => {
      if (!booking || isSaving) return;

      if (guests.length === 0) {
        Alert.alert("Error", "Please add at least one guest");
        return;
      }

      setIsSaving(true);
      try {
        await CalComAPIService.addGuests(booking.uid, guests);
        Alert.alert("Success", "Guests added successfully", [{ text: "OK", onPress: onSuccess }]);
        setIsSaving(false);
      } catch (error) {
        safeLogError("[AddGuestsScreen] Failed to add guests:", error);
        Alert.alert("Error", "Failed to add guests. Please try again.");
        setIsSaving(false);
      }
    }, [booking, guests, onSuccess, isSaving]);

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
            <Text className="mb-2 px-1 text-[13px] font-medium text-gray-500">Email *</Text>
          )}
          <View
            className={`mb-3 overflow-hidden rounded-xl px-4 py-3 ${
              transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
            }`}
          >
            {!transparentBackground && (
              <Text className="mb-1.5 text-[13px] font-medium text-gray-500">Email *</Text>
            )}
            <TextInput
              className="h-10 text-[17px] text-[#000]"
              placeholder="guest@example.com"
              placeholderTextColor="#9CA3AF"
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
            <Text className="mb-2 px-1 text-[13px] font-medium text-gray-500">Name (optional)</Text>
          )}
          <View
            className={`mb-4 overflow-hidden rounded-xl px-4 py-3 ${
              transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
            }`}
          >
            {!transparentBackground && (
              <Text className="mb-1.5 text-[13px] font-medium text-gray-500">Name (optional)</Text>
            )}
            <TextInput
              className="h-10 text-[17px] text-[#000]"
              placeholder="Guest Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              editable={!isSaving}
            />
          </View>

          {/* Add button */}
          <TouchableOpacity
            className={`mb-6 flex-row items-center justify-center rounded-xl py-3 ${
              transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
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
              <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-gray-500">
                Guests to add ({guests.length})
              </Text>
              <View
                className={`overflow-hidden rounded-xl ${
                  transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
                }`}
              >
                {guests.map((guest, index) => (
                  <View
                    key={guest.email}
                    className={`flex-row items-center px-4 py-3 ${
                      index < guests.length - 1 ? "border-b border-gray-100/50" : ""
                    }`}
                  >
                    <View
                      className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${pillStyle}`}
                    >
                      <Ionicons name="person" size={20} color="#6B7280" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[17px] text-[#000]">{guest.email}</Text>
                      {guest.name && (
                        <Text className="mt-0.5 text-[15px] text-gray-500">{guest.name}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveGuest(index)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={isSaving}
                    >
                      <Ionicons name="close-circle-outline" size={24} color="#800020" />
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
