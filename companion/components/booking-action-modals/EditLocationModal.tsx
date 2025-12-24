/**
 * EditLocationModal Component
 *
 * Modal for editing the location of a booking.
 * Shows a note that calendar events may not be updated.
 */
import { FullScreenModal } from "../FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";

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

  return (
    <FullScreenModal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-base text-gray-600">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Edit Location</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text className="text-base font-medium text-black">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          {/* Warning note */}
          <View className="mb-4 flex-row items-start rounded-lg bg-yellow-50 p-3">
            <Ionicons name="warning" size={20} color="#D97706" />
            <Text className="ml-2 flex-1 text-sm text-yellow-700">
              Note: Updating the location here may not update the calendar event. Attendees will be
              notified of the change.
            </Text>
          </View>

          {/* Location input */}
          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-gray-700">Location</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Enter location (URL, address, or phone number)"
              value={location}
              onChangeText={setLocation}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Location type suggestions */}
          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Supported formats:</Text>
            <View className="space-y-2">
              <View className="flex-row items-center">
                <Ionicons name="link" size={16} color="#6B7280" />
                <Text className="ml-2 text-sm text-gray-600">
                  Meeting link (e.g., Zoom, Google Meet)
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="location" size={16} color="#6B7280" />
                <Text className="ml-2 text-sm text-gray-600">Physical address</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="call" size={16} color="#6B7280" />
                <Text className="ml-2 text-sm text-gray-600">Phone number</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </FullScreenModal>
  );
}
