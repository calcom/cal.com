/**
 * AddGuestsModal Component - iOS Implementation
 *
 * iOS-specific modal for adding guests to a booking with Glass UI header.
 */
import { FullScreenModal } from "../FullScreenModal";
import { GlassModalHeader } from "../GlassModalHeader";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AddGuestsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (guests: Array<{ email: string; name?: string }>) => Promise<void>;
  isLoading?: boolean;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export default function AddGuestsModal(props: AddGuestsModalProps) {
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
      await props.onSubmit(guests);
      setGuests([]);
      setEmail("");
      setName("");
      props.onClose();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to add guests");
    }
  };

  const handleClose = () => {
    setGuests([]);
    setEmail("");
    setName("");
    props.onClose();
  };

  const canSave = guests.length > 0 && !props.isLoading;

  return (
    <FullScreenModal visible={props.visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-[#F2F2F7]">
        {/* Header */}
        <GlassModalHeader
          title="Add Guests"
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
                  autoComplete="email"
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
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
            </View>

            {/* Add Guest Button */}
            <TouchableOpacity
              className="mb-4 flex-row items-center justify-center rounded-xl bg-[#007AFF] py-3"
              onPress={handleAddGuest}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text className="ml-2 text-[17px] font-semibold text-white">Add Guest</Text>
            </TouchableOpacity>

            {/* Guests List */}
            {guests.length > 0 && (
              <View className="mb-4">
                <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-gray-500">
                  Added Guests ({guests.length})
                </Text>
                <View className="overflow-hidden rounded-xl bg-white">
                  {guests.map((guest, index) => (
                    <View
                      key={index}
                      className={`flex-row items-center justify-between px-4 py-3 ${
                        index < guests.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <View className="flex-1">
                        {guest.name && (
                          <Text className="text-[17px] font-medium text-[#000]">{guest.name}</Text>
                        )}
                        <Text
                          className={`text-[15px] ${guest.name ? "text-gray-600" : "text-[#000]"}`}
                        >
                          {guest.email}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveGuest(index)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
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
