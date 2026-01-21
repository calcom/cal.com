/**
 * RescheduleScreen Component (Android)
 *
 * Android-specific implementation using the DateTimePickerAndroid imperative API
 * for native Material Design date/time picker dialogs.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { showErrorAlert } from "@/utils/alerts";
import { safeLogError, safeLogInfo } from "@/utils/safeLogger";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

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
        showErrorAlert("Error", "Please select a future date and time");
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
            showErrorAlert("Error", "Failed to reschedule booking. Please try again.");
          },
        }
      );
    }, [booking, selectedDateTime, reason, onSuccess, isSaving, rescheduleBooking]);

    const openDatePicker = useCallback(() => {
      DateTimePickerAndroid.open({
        value: selectedDateTime,
        mode: "date",
        onChange: (event, date) => {
          if (event.type === "set" && date) {
            // Preserve the current time when changing date
            const newDate = new Date(date);
            newDate.setHours(selectedDateTime.getHours());
            newDate.setMinutes(selectedDateTime.getMinutes());
            setSelectedDateTime(newDate);
          }
        },
        minimumDate: new Date(), // Prevent selecting past dates
      });
    }, [selectedDateTime]);

    const openTimePicker = useCallback(() => {
      DateTimePickerAndroid.open({
        value: selectedDateTime,
        mode: "time",
        is24Hour: false, // Match current 12-hour format
        onChange: (event, date) => {
          if (event.type === "set" && date) {
            // Preserve the current date when changing time
            const newDate = new Date(selectedDateTime);
            newDate.setHours(date.getHours());
            newDate.setMinutes(date.getMinutes());
            setSelectedDateTime(newDate);
          }
        },
      });
    }, [selectedDateTime]);

    // Format date for display
    const formattedDate = selectedDateTime.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Format time for display (12-hour)
    const formattedTime = formatTime12Hour(selectedDateTime);

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
                openDatePicker();
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
                openTimePicker();
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
    );
  }
);

export default RescheduleScreen;
