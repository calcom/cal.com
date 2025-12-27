/**
 * RescheduleScreen Component
 *
 * Screen content for rescheduling a booking.
 * Used with the reschedule route that has native Stack.Header.
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
  TouchableOpacity,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Note: @expo/ui DateTimePicker components are not yet stable
// Using a simple inline picker approach instead

export interface RescheduleScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
}

// Handle type for parent component to call submit
export interface RescheduleScreenHandle {
  submit: () => void;
}

export const RescheduleScreen = forwardRef<RescheduleScreenHandle, RescheduleScreenProps>(
  function RescheduleScreen({ booking, onSuccess, onSavingChange }, ref) {
    const insets = useSafeAreaInsets();
    const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill with current booking date/time
    useEffect(() => {
      if (booking?.startTime) {
        const bookingDate = new Date(booking.startTime);
        if (!isNaN(bookingDate.getTime())) {
          setSelectedDateTime(bookingDate);
          setReason("");
        }
      }
    }, [booking?.startTime]);

    // Notify parent of saving state changes
    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    const handleSubmit = useCallback(async () => {
      if (!booking) return;

      // Validate the date is in the future
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
      } catch (error) {
        console.error("[RescheduleScreen] Failed to reschedule:", error);
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to reschedule booking"
        );
      } finally {
        setIsSaving(false);
      }
    }, [booking, selectedDateTime, reason, onSuccess]);

    // Format date for display
    const formattedDate = selectedDateTime.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format time for display
    const formattedTime = selectedDateTime.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

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

    // Generate date options for picker (next 90 days)
    const dateOptions = React.useMemo(() => {
      const options: Array<{ label: string; value: Date }> = [];
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        options.push({
          label: date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          value: date,
        });
      }
      return options;
    }, []);

    // Generate time options (every 15 minutes)
    const timeOptions = React.useMemo(() => {
      const options: Array<{ label: string; value: { hour: number; minute: number } }> = [];
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
          options.push({
            label: time,
            value: { hour, minute },
          });
        }
      }
      return options;
    }, []);

    return (
      <>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-[#F2F2F7]"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
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
              <TouchableOpacity
                className="border-b border-gray-100 px-4 py-3"
                onPress={() => {
                  console.log("[RescheduleScreen] Opening date picker");
                  setShowDatePicker(true);
                }}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">New Date</Text>
                <View className="flex-row items-center justify-between">
                  <Text className="h-10 text-[17px] text-[#000]" style={{ lineHeight: 40 }}>
                    {formattedDate}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                </View>
              </TouchableOpacity>

              {/* Time picker */}
              <TouchableOpacity
                className="border-b border-gray-100 px-4 py-3"
                onPress={() => {
                  console.log("[RescheduleScreen] Opening time picker");
                  setShowTimePicker(true);
                }}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text className="mb-1.5 text-[13px] font-medium text-gray-500">New Time</Text>
                <View className="flex-row items-center justify-between">
                  <Text className="h-10 text-[17px] text-[#000]" style={{ lineHeight: 40 }}>
                    {formattedTime}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#007AFF" />
                </View>
              </TouchableOpacity>

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

        {/* Date Picker Modal - Center Dialog */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/50"
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <TouchableOpacity activeOpacity={1}>
              <View className="w-[320px] overflow-hidden rounded-2xl bg-white">
                <Text className="border-b border-gray-200 py-3 text-center text-[17px] font-semibold text-[#000]">
                  Select Date
                </Text>
                <ScrollView
                  style={{ maxHeight: 280 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {dateOptions.map((option, index) => {
                    const isSelected =
                      option.value.toDateString() === selectedDateTime.toDateString();
                    return (
                      <TouchableOpacity
                        key={index}
                        className={`px-4 py-3 ${isSelected ? "bg-[#E8F4FD]" : ""}`}
                        onPress={() => {
                          const newDate = new Date(option.value);
                          newDate.setHours(selectedDateTime.getHours());
                          newDate.setMinutes(selectedDateTime.getMinutes());
                          setSelectedDateTime(newDate);
                        }}
                        activeOpacity={0.7}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className={`text-[17px] ${
                              isSelected ? "font-semibold text-[#007AFF]" : "text-[#000]"
                            }`}
                          >
                            {option.label}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={22} color="#007AFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  className="border-t border-gray-200 py-3"
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text className="text-center text-[17px] font-semibold text-[#007AFF]">Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Time Picker Modal - Center Dialog */}
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/50"
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <TouchableOpacity activeOpacity={1}>
              <View className="w-[320px] overflow-hidden rounded-2xl bg-white">
                <Text className="border-b border-gray-200 py-3 text-center text-[17px] font-semibold text-[#000]">
                  Select Time
                </Text>
                <ScrollView
                  style={{ maxHeight: 280 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {timeOptions.map((option, index) => {
                    const isSelected =
                      selectedDateTime.getHours() === option.value.hour &&
                      selectedDateTime.getMinutes() === option.value.minute;
                    return (
                      <TouchableOpacity
                        key={index}
                        className={`px-4 py-3 ${isSelected ? "bg-[#E8F4FD]" : ""}`}
                        onPress={() => {
                          const newDate = new Date(selectedDateTime);
                          newDate.setHours(option.value.hour);
                          newDate.setMinutes(option.value.minute);
                          setSelectedDateTime(newDate);
                        }}
                        activeOpacity={0.7}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className={`text-[17px] ${
                              isSelected ? "font-semibold text-[#007AFF]" : "text-[#000]"
                            }`}
                          >
                            {option.label}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={22} color="#007AFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  className="border-t border-gray-200 py-3"
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text className="text-center text-[17px] font-semibold text-[#007AFF]">Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }
);

// Default export for React Native compatibility
export default RescheduleScreen;
