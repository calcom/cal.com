/**
 * EditLocationModal Component
 *
 * Modal for editing the location of a booking.
 * Shows a note that calendar events may not be updated.
 */
import { FullScreenModal } from "../FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EditLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (location: string) => Promise<void>;
  currentLocation?: string;
  isLoading?: boolean;
}

export function EditLocationModal({
  visible,
  onClose,
  onSubmit,
  currentLocation = "",
  isLoading = false,
}: EditLocationModalProps) {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(currentLocation);

  // Reset location when modal opens
  useEffect(() => {
    if (visible) {
      setLocation(currentLocation);
    }
  }, [visible, currentLocation]);

  const handleSubmit = async () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      Alert.alert("Error", "Please enter a location");
      return;
    }

    try {
      await onSubmit(trimmedLocation);
      onClose();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update location");
    }
  };

  const handleClose = () => {
    setLocation(currentLocation);
    onClose();
  };

  const canSave = location.trim().length > 0 && !isLoading;

  return (
    <FullScreenModal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-[#F2F2F7]" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-base text-[#007AFF]">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-[17px] font-semibold text-[#000]">Edit Location</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text
                className={`text-base font-semibold ${canSave ? "text-[#007AFF]" : "text-gray-300"}`}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
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
                Note: Updating the location here may not update the calendar event. Attendees will
                be notified of the change.
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
                <View className="flex-row items-center">
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#E8E8ED]">
                    <Ionicons name="location" size={16} color="#6B7280" />
                  </View>
                  <Text className="text-[15px] text-gray-700">Physical address</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#E8E8ED]">
                    <Ionicons name="call" size={16} color="#6B7280" />
                  </View>
                  <Text className="text-[15px] text-gray-700">Phone number</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </FullScreenModal>
  );
}
