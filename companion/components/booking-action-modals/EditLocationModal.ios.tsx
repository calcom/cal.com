/**
 * EditLocationModal Component - iOS Implementation
 *
 * iOS-specific modal for editing the location of a booking with Glass UI header.
 */
import { FullScreenModal } from "../FullScreenModal";
import { GlassModalHeader } from "../GlassModalHeader";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, ScrollView, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface EditLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (location: string) => Promise<void>;
  currentLocation?: string;
  isLoading?: boolean;
}

export default function EditLocationModal(props: EditLocationModalProps) {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(props.currentLocation || "");

  // Reset location when modal opens
  useEffect(() => {
    if (props.visible) {
      setLocation(props.currentLocation || "");
    }
  }, [props.visible, props.currentLocation]);

  const handleSubmit = async () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      Alert.alert("Error", "Please enter a location");
      return;
    }

    try {
      await props.onSubmit(trimmedLocation);
      props.onClose();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update location");
    }
  };

  const handleClose = () => {
    setLocation(props.currentLocation || "");
    props.onClose();
  };

  const canSave = location.trim().length > 0 && !props.isLoading;

  return (
    <FullScreenModal visible={props.visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-[#F2F2F7]">
        {/* Header */}
        <GlassModalHeader
          title="Edit Location"
          onClose={handleClose}
          onAction={handleSubmit}
          actionLabel="Save"
          actionDisabled={!canSave}
          actionLoading={props.isLoading}
        />

        {/* Content */}
        <KeyboardAvoidingView behavior="padding" className="flex-1">
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

            {/* Form Card */}
            <View className="overflow-hidden rounded-xl bg-white">
              <View className="px-4 py-3">
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">New Location</Text>
                <TextInput
                  className="min-h-[100px] text-[17px] text-[#000]"
                  placeholder="Enter location (URL, address, or meeting details)..."
                  placeholderTextColor="#9CA3AF"
                  value={location}
                  onChangeText={setLocation}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </View>
            </View>

            {/* Info note */}
            <View className="mt-4 flex-row items-start rounded-xl bg-[#E3F2FD] p-4">
              <Ionicons name="information-circle" size={20} color="#1976D2" />
              <Text className="ml-3 flex-1 text-[15px] leading-5 text-[#1565C0]">
                You can enter a physical address, video conference link, or phone number.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </FullScreenModal>
  );
}
