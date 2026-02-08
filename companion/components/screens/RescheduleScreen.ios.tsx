/**
 * RescheduleScreen Component (iOS)
 *
 * iOS-specific implementation with native DatePicker for date/time selection.
 * Uses @expo/ui/swift-ui DatePicker for the native iOS picker.
 */

import { DatePicker, Host } from "@expo/ui/swift-ui";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRescheduleBooking } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { safeLogError, safeLogInfo } from "@/utils/safeLogger";

export interface RescheduleScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  transparentBackground?: boolean;
  useNativeHeader?: boolean;
}

export interface RescheduleScreenHandle {
  submit: () => void;
}

export const RescheduleScreen = forwardRef<RescheduleScreenHandle, RescheduleScreenProps>(
  function RescheduleScreen(
    { booking, onSuccess, onSavingChange, transparentBackground = false },
    ref
  ) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const colors = {
      background: isDark ? "#000000" : "#F2F2F7",
      cardBackground: isDark ? "#171717" : "#FFFFFF",
      text: isDark ? "#FFFFFF" : "#000000",
      textSecondary: isDark ? "#A3A3A3" : "#6B7280",
      border: isDark ? "#4D4D4D" : "#E5E5EA",
      borderLight: isDark ? "#2C2C2E" : "#F3F4F6",
      pill: isDark ? "#4D4D4D" : "#E8E8ED",
      inputBorder: isDark ? "rgba(56, 56, 58, 0.4)" : "rgba(209, 213, 219, 0.4)",
      inputBackground: isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
    };

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

      rescheduleBooking(
        {
          uid: booking.uid,
          start: selectedDateTime.toISOString(),
          reschedulingReason: reason.trim() || undefined,
        },
        {
          onSuccess: () => {
            showSuccessAlert("Success", "Booking rescheduled successfully");
            onSuccess();
          },
          onError: (error) => {
            safeLogError("[RescheduleScreen] Failed to reschedule:", error);
            showErrorAlert("Error", "Failed to reschedule booking. Please try again.");
          },
        }
      );
    }, [booking, selectedDateTime, reason, onSuccess, isSaving, rescheduleBooking]);

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
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: transparentBackground ? "transparent" : colors.background }}
        >
          <Text style={{ color: colors.textSecondary }}>No booking data</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
        style={{ backgroundColor: transparentBackground ? "transparent" : colors.background }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={!transparentBackground}
        >
          {transparentBackground ? (
            <>
              {/* Booking Title */}
              <Text
                className="mb-4 mt-4 text-center text-[17px] font-semibold"
                style={{ color: colors.text }}
                numberOfLines={2}
              >
                {booking.title}
              </Text>

              {/* Date and Time pickers - side by side */}
              <View className="mb-4 flex-row items-center justify-center">
                <Host matchContents>
                  <DatePicker
                    onDateChange={handleDateSelected}
                    displayedComponents={["date"]}
                    selection={selectedDateTime}
                  />
                </Host>
                <Text className="mx-2 text-[15px]" style={{ color: colors.textSecondary }}>
                  at
                </Text>
                <Host matchContents>
                  <DatePicker
                    onDateChange={handleTimeSelected}
                    displayedComponents={["hourAndMinute"]}
                    selection={selectedDateTime}
                  />
                </Host>
              </View>

              {/* Reason input */}
              <Text
                className="mb-2 px-1 text-[13px] font-medium"
                style={{ color: colors.textSecondary }}
              >
                Reason (optional)
              </Text>
              <View
                className="mb-3 overflow-hidden rounded-xl px-4 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBackground,
                }}
              >
                <TextInput
                  className="min-h-[80px] text-[17px]"
                  style={{ color: colors.text }}
                  placeholder="Enter reason for rescheduling..."
                  placeholderTextColor={colors.textSecondary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  textAlignVertical="top"
                  editable={!isSaving}
                />
              </View>
            </>
          ) : (
            <>
              {/* Booking Title Card */}
              <View
                className="mb-4 flex-row items-start rounded-xl p-4"
                style={{ backgroundColor: colors.cardBackground }}
              >
                <View
                  className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.pill }}
                >
                  <Ionicons name="calendar" size={20} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-medium" style={{ color: colors.textSecondary }}>
                    Rescheduling
                  </Text>
                  <Text
                    className="mt-0.5 text-[17px] font-medium"
                    style={{ color: colors.text }}
                    numberOfLines={2}
                  >
                    {booking.title}
                  </Text>
                </View>
              </View>

              {/* Form Card */}
              <View
                className="mb-4 overflow-hidden rounded-xl"
                style={{ backgroundColor: colors.cardBackground }}
              >
                {/* Date picker */}
                <View
                  className="px-4 py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                >
                  <Text
                    className="mb-2 text-[13px] font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    New Date
                  </Text>
                  <Host matchContents>
                    <DatePicker
                      onDateChange={handleDateSelected}
                      displayedComponents={["date"]}
                      selection={selectedDateTime}
                    />
                  </Host>
                </View>

                {/* Time picker */}
                <View
                  className="px-4 py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                >
                  <Text
                    className="mb-2 text-[13px] font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    New Time
                  </Text>
                  <Host matchContents>
                    <DatePicker
                      onDateChange={handleTimeSelected}
                      displayedComponents={["hourAndMinute"]}
                      selection={selectedDateTime}
                    />
                  </Host>
                </View>

                {/* Reason input */}
                <View className="px-4 py-3">
                  <Text
                    className="mb-1.5 text-[13px] font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    Reason (optional)
                  </Text>
                  <TextInput
                    className="min-h-[80px] text-[17px]"
                    style={{ color: colors.text }}
                    placeholder="Enter reason for rescheduling..."
                    placeholderTextColor={colors.textSecondary}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    textAlignVertical="top"
                    editable={!isSaving}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

export default RescheduleScreen;
