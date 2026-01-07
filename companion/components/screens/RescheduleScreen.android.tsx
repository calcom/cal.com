/**
 * RescheduleScreen Component (Android)
 *
 * Android-specific implementation with modal-based date/time picker.
 * Uses custom modal dialogs with Material Design 3 inspired styling.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { useRescheduleBooking } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { safeLogError, safeLogInfo } from "@/utils/safeLogger";

export interface RescheduleScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  useNativeHeader?: boolean;
}

export interface RescheduleScreenHandle {
  submit: () => void;
}

// Format time in 12-hour format
function formatTime12Hour(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

export const RescheduleScreen = forwardRef<RescheduleScreenHandle, RescheduleScreenProps>(
  function RescheduleScreen({ booking, onSuccess, onSavingChange, useNativeHeader = false }, ref) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [reason, setReason] = useState("");

    // Use React Query mutation for automatic cache invalidation
    const { mutate: rescheduleBooking, isPending: isSaving } = useRescheduleBooking();

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

    const handleSubmit = useCallback(() => {
      if (!booking || isSaving) return;

      if (selectedDateTime <= new Date()) {
        Alert.alert("Error", "Please select a future date and time");
        return;
      }

      const reschedulingReason = reason.trim() || undefined;
      rescheduleBooking(
        {
          uid: booking.uid,
          start: selectedDateTime.toISOString(),
          reschedulingReason,
        },
        {
          onSuccess: () => {
            Alert.alert("Success", "Booking rescheduled successfully", [
              { text: "OK", onPress: onSuccess },
            ]);
          },
          onError: (error) => {
            safeLogError("[RescheduleScreen] Failed to reschedule:", error);
            Alert.alert("Error", "Failed to reschedule booking. Please try again.");
          },
        }
      );
    }, [booking, selectedDateTime, reason, onSuccess, isSaving, rescheduleBooking]);

    // Format date for display
    const formattedDate = selectedDateTime.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Format time for display (12-hour)
    const formattedTime = formatTime12Hour(selectedDateTime);

    // Generate date options for picker (next 90 days)
    const dateOptions = React.useMemo(() => {
      const options: { label: string; sublabel: string; value: Date }[] = [];
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const isToday = i === 0;
        const isTomorrow = i === 1;
        options.push({
          label: isToday
            ? "Today"
            : isTomorrow
              ? "Tomorrow"
              : date.toLocaleDateString(undefined, {
                  weekday: "long",
                }),
          sublabel: date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          value: date,
        });
      }
      return options;
    }, []);

    // Extract booking times for stable dependency references
    const bookingStartTime = booking?.startTime;
    const bookingEndTime = booking?.endTime;

    // Calculate booking duration in minutes
    const bookingDurationMinutes = React.useMemo(() => {
      if (!bookingStartTime || !bookingEndTime) return 30; // Default to 30 min
      const start = new Date(bookingStartTime);
      const end = new Date(bookingEndTime);
      const durationMs = end.getTime() - start.getTime();
      const durationMin = Math.round(durationMs / (1000 * 60));
      // Ensure slot interval is reasonable (minimum 5 min, maximum 60 min)
      if (durationMin < 5) return 5;
      if (durationMin > 60) return 60;
      return durationMin;
    }, [bookingStartTime, bookingEndTime]);

    // Generate time options based on booking duration
    const timeOptions = React.useMemo(() => {
      const options: {
        label: string;
        value: { hour: number; minute: number };
      }[] = [];
      const interval = bookingDurationMinutes;

      for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += interval) {
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        const time = `${displayHour}:${String(minute).padStart(2, "0")} ${ampm}`;
        options.push({
          label: time,
          value: { hour, minute },
        });
      }
      return options;
    }, [bookingDurationMinutes]);

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
      <>
        <KeyboardAvoidingView behavior="height" className="flex-1 bg-[#F2F2F7]">
          {/* Header - only shown when not using native header */}
          {!useNativeHeader && (
            <View
              style={{
                backgroundColor: "#fff",
                paddingTop: insets.top,
                paddingBottom: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E5EA",
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 44,
                }}
              >
                <AppPressable
                  onPress={() => router.back()}
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "flex-start",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chevron-back" size={24} color="#000" />
                </AppPressable>

                <Text
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#000",
                    marginHorizontal: 10,
                  }}
                  numberOfLines={1}
                >
                  Reschedule
                </Text>

                <AppPressable
                  onPress={handleSubmit}
                  disabled={isSaving}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    opacity: isSaving ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#007AFF",
                    }}
                  >
                    Save
                  </Text>
                </AppPressable>
              </View>
            </View>
          )}

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
              {/* Date picker trigger */}
              <Pressable
                className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#F9F9F9" : "transparent",
                })}
                onPress={() => {
                  safeLogInfo("[RescheduleScreen] Opening date picker");
                  setShowDatePicker(true);
                }}
                disabled={isSaving}
              >
                <View className="flex-1">
                  <Text className="mb-1 text-[13px] font-medium text-gray-500">New Date</Text>
                  <Text className="text-[17px] text-[#000]">{formattedDate}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </Pressable>

              {/* Time picker trigger */}
              <Pressable
                className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#F9F9F9" : "transparent",
                })}
                onPress={() => {
                  safeLogInfo("[RescheduleScreen] Opening time picker");
                  setShowTimePicker(true);
                }}
                disabled={isSaving}
              >
                <View className="flex-1">
                  <Text className="mb-1 text-[13px] font-medium text-gray-500">New Time</Text>
                  <Text className="text-[17px] text-[#000]">{formattedTime}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </Pressable>

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
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              justifyContent: "flex-end",
            }}
          >
            <Pressable
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onPress={() => setShowDatePicker(false)}
            />
            <View
              style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: "70%",
                paddingBottom: insets.bottom,
              }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text className="text-[17px] text-gray-500">Cancel</Text>
                </Pressable>
                <Text className="text-[17px] font-semibold text-[#000]">Select Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text className="text-[17px] font-semibold text-[#007AFF]">Done</Text>
                </Pressable>
              </View>

              {/* Date List */}
              <ScrollView showsVerticalScrollIndicator={false}>
                {dateOptions.map((option, index) => {
                  const isSelected =
                    option.value.toDateString() === selectedDateTime.toDateString();
                  return (
                    <Pressable
                      key={option.value.toISOString()}
                      className="flex-row items-center justify-between px-4 py-3.5"
                      style={({ pressed }) => ({
                        backgroundColor: isSelected
                          ? "rgba(0, 122, 255, 0.1)"
                          : pressed
                            ? "#F5F5F5"
                            : "#fff",
                        borderBottomWidth: index < dateOptions.length - 1 ? 1 : 0,
                        borderBottomColor: "#F2F2F7",
                      })}
                      onPress={() => {
                        const newDate = new Date(option.value);
                        newDate.setHours(selectedDateTime.getHours());
                        newDate.setMinutes(selectedDateTime.getMinutes());
                        setSelectedDateTime(newDate);
                      }}
                    >
                      <View>
                        <Text
                          className={`text-[17px] ${
                            isSelected ? "font-semibold text-[#007AFF]" : "font-medium text-[#000]"
                          }`}
                        >
                          {option.label}
                        </Text>
                        <Text
                          className={`mt-0.5 text-[13px] ${isSelected ? "text-[#007AFF]" : "text-gray-500"}`}
                        >
                          {option.sublabel}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={22} color="#007AFF" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              justifyContent: "flex-end",
            }}
          >
            <Pressable
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onPress={() => setShowTimePicker(false)}
            />
            <View
              style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: "60%",
                paddingBottom: insets.bottom,
              }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text className="text-[17px] text-gray-500">Cancel</Text>
                </Pressable>
                <Text className="text-[17px] font-semibold text-[#000]">Select Time</Text>
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text className="text-[17px] font-semibold text-[#007AFF]">Done</Text>
                </Pressable>
              </View>

              {/* Time Grid */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  padding: 16,
                }}
              >
                {timeOptions.map((option) => {
                  const isSelected =
                    selectedDateTime.getHours() === option.value.hour &&
                    selectedDateTime.getMinutes() === option.value.minute;
                  return (
                    <Pressable
                      key={option.label}
                      style={{ width: "25%", padding: 4 }}
                      onPress={() => {
                        const newDate = new Date(selectedDateTime);
                        newDate.setHours(option.value.hour);
                        newDate.setMinutes(option.value.minute);
                        setSelectedDateTime(newDate);
                      }}
                    >
                      <View
                        className={`items-center justify-center rounded-lg py-3 ${
                          isSelected ? "bg-[#007AFF]" : "bg-[#F2F2F7]"
                        }`}
                      >
                        <Text
                          className={`text-[13px] ${
                            isSelected ? "font-semibold text-white" : "font-medium text-[#000]"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }
);

export default RescheduleScreen;
