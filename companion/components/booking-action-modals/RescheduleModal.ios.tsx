/**
 * RescheduleModal Component - iOS Implementation
 *
 * iOS-specific modal for rescheduling a booking with Glass UI header.
 */
import { FullScreenModal } from "../FullScreenModal";
import { GlassModalHeader } from "../GlassModalHeader";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, ScrollView, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface RescheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (date: string, time: string, reason?: string) => Promise<void>;
  bookingTitle?: string;
  currentStartTime?: string;
  isLoading?: boolean;
}

/**
 * Format a date string to YYYY-MM-DD format
 */
function formatDateForInput(dateString: string | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

/**
 * Format a date string to HH:MM format (24-hour)
 */
function formatTimeForInput(dateString: string | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export default function RescheduleModal(props: RescheduleModalProps) {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  // Pre-fill with current booking date/time when modal opens
  useEffect(() => {
    if (props.visible && props.currentStartTime) {
      setDate(formatDateForInput(props.currentStartTime));
      setTime(formatTimeForInput(props.currentStartTime));
      setReason("");
    }
  }, [props.visible, props.currentStartTime]);

  const handleSubmit = async () => {
    if (!date.trim()) {
      Alert.alert("Error", "Please enter a date");
      return;
    }

    if (!time.trim()) {
      Alert.alert("Error", "Please enter a time");
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) {
      Alert.alert("Error", "Please enter date in YYYY-MM-DD format");
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time.trim())) {
      Alert.alert("Error", "Please enter time in HH:MM format (24-hour)");
      return;
    }

    // Validate the date is in the future
    const dateTimeStr = `${date.trim()}T${time.trim()}:00`;
    const newDateTime = new Date(dateTimeStr);
    if (isNaN(newDateTime.getTime())) {
      Alert.alert("Error", "Invalid date or time");
      return;
    }

    if (newDateTime <= new Date()) {
      Alert.alert("Error", "Please select a future date and time");
      return;
    }

    try {
      await props.onSubmit(date.trim(), time.trim(), reason.trim() || undefined);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to reschedule booking");
    }
  };

  const handleClose = () => {
    setDate("");
    setTime("");
    setReason("");
    props.onClose();
  };

  const canSubmit = date.trim().length > 0 && time.trim().length > 0 && !props.isLoading;

  return (
    <FullScreenModal visible={props.visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-[#F2F2F7]">
        {/* Header */}
        <GlassModalHeader
          title="Reschedule"
          onClose={handleClose}
          onAction={handleSubmit}
          actionLabel="Save"
          actionDisabled={!canSubmit}
          actionLoading={props.isLoading}
        />

        {/* Content */}
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Booking Title */}
            {props.bookingTitle && (
              <View className="mb-4 flex-row items-start rounded-xl bg-white p-4">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#E8E8ED]">
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-medium text-gray-500">Rescheduling</Text>
                  <Text className="mt-0.5 text-[17px] font-medium text-[#000]" numberOfLines={2}>
                    {props.bookingTitle}
                  </Text>
                </View>
              </View>
            )}

            {/* Form Card */}
            <View className="mb-4 overflow-hidden rounded-xl bg-white">
              {/* Date input */}
              <View className="border-b border-gray-100 px-4 py-3">
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">
                  New Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  className="h-10 text-[17px] text-[#000]"
                  placeholder="2025-12-25"
                  placeholderTextColor="#9CA3AF"
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Time input */}
              <View className="border-b border-gray-100 px-4 py-3">
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">
                  New Time (HH:MM, 24-hour)
                </Text>
                <TextInput
                  className="h-10 text-[17px] text-[#000]"
                  placeholder="14:30"
                  placeholderTextColor="#9CA3AF"
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Reason input */}
              <View className="px-4 py-3">
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">
                  Reason (optional)
                </Text>
                <TextInput
                  className="min-h-[80px] text-[17px] text-[#000]"
                  placeholder="Enter reason for rescheduling..."
                  placeholderTextColor="#9CA3AF"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Info note */}
            <View className="flex-row items-start rounded-xl bg-[#E3F2FD] p-4">
              <Ionicons name="information-circle" size={20} color="#1976D2" />
              <Text className="ml-3 flex-1 text-[15px] leading-5 text-[#1565C0]">
                Attendees will receive an email notification about the new time.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </FullScreenModal>
  );
}
