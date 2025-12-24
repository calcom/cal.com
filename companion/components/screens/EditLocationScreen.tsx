/**
 * EditLocationScreen Component
 *
 * Screen content for editing the location of a booking.
 * Used with the edit-location route that has native Stack.Header.
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface EditLocationScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
}

// Handle type for parent component to call submit
export interface EditLocationScreenHandle {
  submit: () => void;
}

export const EditLocationScreen = forwardRef<EditLocationScreenHandle, EditLocationScreenProps>(
  function EditLocationScreen({ booking, onSuccess, onSavingChange }, ref) {
    const insets = useSafeAreaInsets();
    const [location, setLocation] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill with current location
    useEffect(() => {
      if (booking?.location) {
        setLocation(booking.location);
      }
    }, [booking?.location]);

    // Notify parent of saving state changes
    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    const handleSubmit = useCallback(async () => {
      if (!booking) return;

      const trimmedLocation = location.trim();
      if (!trimmedLocation) {
        Alert.alert("Error", "Please enter a location");
        return;
      }

      setIsSaving(true);
      try {
        await CalComAPIService.updateLocation(booking.uid, trimmedLocation);
        Alert.alert("Success", "Location updated successfully", [
          { text: "OK", onPress: onSuccess },
        ]);
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to update location");
      } finally {
        setIsSaving(false);
      }
    }, [booking, location, onSuccess]);

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
        <View className="flex-1 items-center justify-center bg-[#F2F2F7]">
          <Text className="text-gray-500">No booking data</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-[#F2F2F7]"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warning note */}
          <View className="mb-4 flex-row items-start rounded-xl bg-[#FFF3E0] p-4">
            <Ionicons name="warning" size={20} color="#E65100" />
            <Text className="ml-3 flex-1 text-[15px] leading-5 text-[#E65100]">
              Note: Updating the location here may not update the calendar event. Attendees will be
              notified of the change.
            </Text>
          </View>

          {/* Location input Card */}
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            <View className="px-4 py-3">
              <Text className="mb-1.5 text-[13px] font-medium text-gray-500">Location</Text>
              <TextInput
                className="min-h-[80px] text-[17px] text-[#000]"
                placeholder="Enter location (URL, address, or phone number)"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
                multiline
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>
          </View>

          {/* Location type suggestions */}
          <View className="px-1">
            <Text className="mb-3 text-[13px] font-medium uppercase tracking-wide text-gray-500">
              Supported formats:
            </Text>
            <View className="space-y-3">
              <View className="flex-row items-center">
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#E8E8ED]">
                  <Ionicons name="link" size={16} color="#6B7280" />
                </View>
                <Text className="text-[15px] text-gray-700">
                  Meeting link (e.g., Zoom, Google Meet)
                </Text>
              </View>
              <View className="mt-3 flex-row items-center">
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#E8E8ED]">
                  <Ionicons name="location" size={16} color="#6B7280" />
                </View>
                <Text className="text-[15px] text-gray-700">Physical address</Text>
              </View>
              <View className="mt-3 flex-row items-center">
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#E8E8ED]">
                  <Ionicons name="call" size={16} color="#6B7280" />
                </View>
                <Text className="text-[15px] text-gray-700">Phone number</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

// Default export for React Native compatibility
export default EditLocationScreen;
