/**
 * AddGuestsModal Component
 *
 * Modal for adding guests to a booking.
 * Includes email validation and shows a note that guests will be emailed.
 */
import { FullScreenModal } from "../FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";

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

  return (
    <FullScreenModal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-base text-gray-600">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Add Guests</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isLoading || guests.length === 0}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text
                className={`text-base font-medium ${
                  guests.length === 0 ? "text-gray-400" : "text-black"
                }`}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          {/* Info note */}
          <View className="mb-4 flex-row items-start rounded-lg bg-blue-50 p-3">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text className="ml-2 flex-1 text-sm text-blue-700">
              Guests will receive an email notification about this booking.
            </Text>
          </View>

          {/* Email input */}
          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-gray-700">Email *</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="guest@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Name input */}
          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-gray-700">Name (optional)</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Guest Name"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Add button */}
          <TouchableOpacity
            className="mb-4 flex-row items-center justify-center rounded-lg bg-gray-100 py-2"
            onPress={handleAddGuest}
          >
            <Ionicons name="add" size={20} color="#374151" />
            <Text className="ml-1 text-base font-medium text-gray-700">Add Guest</Text>
          </TouchableOpacity>

          {/* Guest list */}
          {guests.length > 0 && (
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Guests to add ({guests.length})
              </Text>
              {guests.map((guest, index) => (
                <View
                  key={index}
                  className="mb-2 flex-row items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <View className="flex-1">
                    <Text className="text-base text-gray-900">{guest.email}</Text>
                    {guest.name && <Text className="text-sm text-gray-500">{guest.name}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveGuest(index)}>
                    <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </FullScreenModal>
  );
}
