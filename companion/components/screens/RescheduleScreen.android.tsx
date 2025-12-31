/**
 * RescheduleScreen Component (Android)
 *
 * Android-specific implementation with native DateTimePicker for date/time selection.
 * Uses @expo/ui/jetpack-compose DateTimePicker for native Android pickers.
 */

import { DateTimePicker } from "@expo/ui/jetpack-compose";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Booking } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import { safeLogError, safeLogInfo } from "@/utils/safeLogger";

export interface RescheduleScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
}

export interface RescheduleScreenHandle {
  submit: () => void;
}

export const RescheduleScreen = forwardRef<RescheduleScreenHandle, RescheduleScreenProps>(
  function RescheduleScreen({ booking, onSuccess, onSavingChange }, ref) {
    "use no memo";
    const insets = useSafeAreaInsets();
    const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      if (booking?.startTime) {
        const bookingDate = new Date(booking.startTime);
        if (!Number.isNaN(bookingDate.getTime())) {
          setSelectedDateTime(bookingDate);
          setReason("");
        }
      }
    }, [booking?.startTime]);

    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    const handleSubmit = useCallback(async () => {
      if (!booking) return;

      if (selectedDateTime <= new Date()) {
        Alert.alert("Error", "Please select a future date and time");
        return;
      }

      setIsSaving(true);
      try {
        await CalComAPIService.rescheduleBooking(booking.uid, {
          start: selectedDateTime.toISOString(),
          reschedulingReason: reason.trim() || undefined,
        });
        Alert.alert("Success", "Booking rescheduled successfully", [
          { text: "OK", onPress: onSuccess },
        ]);
        setIsSaving(false);
      } catch (error) {
        safeLogError("[RescheduleScreen] Failed to reschedule:", error);
        Alert.alert("Error", "Failed to reschedule booking. Please try again.");
        setIsSaving(false);
      }
    }, [booking, selectedDateTime, reason, onSuccess]);

    const handleDateSelected = useCallback(
      (date: Date) => {
        safeLogInfo("[RescheduleScreen] Date selected:", date);
        const newDate = new Date(date);
        newDate.setHours(selectedDateTime.getHours());
        newDate.setMinutes(selectedDateTime.getMinutes());
        setSelectedDateTime(newDate);
      },
      [selectedDateTime]
    );

    const handleTimeSelected = useCallback(
      (date: Date) => {
        safeLogInfo("[RescheduleScreen] Time selected:", date);
        const newDate = new Date(selectedDateTime);
        newDate.setHours(date.getHours());
        newDate.setMinutes(date.getMinutes());
        setSelectedDateTime(newDate);
      },
      [selectedDateTime]
    );

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
      <KeyboardAvoidingView behavior="height" className="flex-1 bg-[#F2F2F7]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Booking Title Card */}
          <View className="mb-4 flex-row items-start rounded-xl bg-white p-4">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#E8E8ED]">
              <Ionicons name="calendar" size={20} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-medium text-gray-500">Rescheduling</Text>
              <Text className="mt-0.5 text-[17px] font-medium text-[#000]" numberOfLines={2}>
                {booking.title}
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            {/* Date picker */}
            <View className="border-b border-gray-100 px-4 py-3">
              <Text className="mb-2 text-[13px] font-medium text-gray-500">New Date</Text>
              <DateTimePicker
                onDateSelected={handleDateSelected}
                displayedComponents="date"
                initialDate={selectedDateTime.toISOString()}
                variant="picker"
              />
            </View>

            {/* Time picker */}
            <View className="border-b border-gray-100 px-4 py-3">
              <Text className="mb-2 text-[13px] font-medium text-gray-500">New Time</Text>
              <DateTimePicker
                onDateSelected={handleTimeSelected}
                displayedComponents="hourAndMinute"
                initialDate={selectedDateTime.toISOString()}
                variant="picker"
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
                editable={!isSaving}
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
    );
  }
);

export default RescheduleScreen;
