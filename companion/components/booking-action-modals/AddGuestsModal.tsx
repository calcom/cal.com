/**
 * AddGuestsModal Component
 *
 * Modal for adding guests to a booking.
 * Includes email validation and shows a note that guests will be emailed.
 */
import { FullScreenModal } from "../FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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

interface AddGuestsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (guests: Array<{ email: string; name?: string }>) => Promise<void>;
  isLoading?: boolean;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function AddGuestsModal({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}: AddGuestsModalProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [guests, setGuests] = useState<Array<{ email: string; name?: string }>>([]);

  const handleAddGuest = () => {
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
  };

  const handleRemoveGuest = (index: number) => {
    setGuests(guests.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (guests.length === 0) {
      Alert.alert("Error", "Please add at least one guest");
      return;
    }

    try {
      await onSubmit(guests);
      setGuests([]);
      setEmail("");
      setName("");
      onClose();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to add guests");
    }
  };

  const handleClose = () => {
    setGuests([]);
    setEmail("");
    setName("");
    onClose();
  };

  const canSave = guests.length > 0 && !isLoading;

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
          <Text className="text-[17px] font-semibold text-[#000]">Add Guests</Text>
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
            {/* Info note */}
            <View className="mb-4 flex-row items-start rounded-xl bg-[#E3F2FD] p-4">
              <Ionicons name="information-circle" size={20} color="#1976D2" />
              <Text className="ml-3 flex-1 text-[15px] leading-5 text-[#1565C0]">
                Guests will receive an email notification about this booking.
              </Text>
            </View>

            {/* Form Card */}
            <View className="mb-4 overflow-hidden rounded-xl bg-white">
              {/* Email input */}
              <View className="border-b border-gray-100 px-4 py-3">
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">Email *</Text>
                <TextInput
                  className="h-10 text-[17px] text-[#000]"
                  placeholder="guest@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Name input */}
              <View className="px-4 py-3">
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">
                  Name (optional)
                </Text>
                <TextInput
                  className="h-10 text-[17px] text-[#000]"
                  placeholder="Guest Name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Add button */}
            <TouchableOpacity
              className="mb-6 flex-row items-center justify-center rounded-xl bg-white py-3"
              onPress={handleAddGuest}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={22} color="#007AFF" />
              <Text className="ml-2 text-[17px] font-medium text-[#007AFF]">Add Guest</Text>
            </TouchableOpacity>

            {/* Guest list */}
            {guests.length > 0 && (
              <View>
                <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-gray-500">
                  Guests to add ({guests.length})
                </Text>
                <View className="overflow-hidden rounded-xl bg-white">
                  {guests.map((guest, index) => (
                    <View
                      key={index}
                      className={`flex-row items-center px-4 py-3 ${
                        index < guests.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#E8E8ED]">
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
                      >
                        <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </FullScreenModal>
  );
}
