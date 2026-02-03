/**
 * RescheduleScreen Component
 *
 * Screen content for rescheduling a booking.
 * Used with the reschedule route that has native Stack.Header.
 * This is the web/extension fallback - uses native HTML inputs on web.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRescheduleBooking } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { safeLogError, safeLogInfo } from "@/utils/safeLogger";

const isWeb = Platform.OS === "web";

export interface RescheduleScreenProps {
  booking: Booking | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  transparentBackground?: boolean;
  useNativeHeader?: boolean;
}

// Handle type for parent component to call submit
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
      pillTransparent: isDark ? "rgba(56, 56, 58, 0.5)" : "rgba(232, 232, 237, 0.5)",
      inputBorder: isDark ? "rgba(56, 56, 58, 0.4)" : "rgba(209, 213, 219, 0.4)",
      inputBackground: isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
      selectedBg: isDark ? "#1C3A5F" : "#E8F4FD",
      accent: "#007AFF",
    };

    const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [reason, setReason] = useState("");

    // Use React Query mutation for automatic cache invalidation
    const { mutate: rescheduleBooking, isPending: isSaving } = useRescheduleBooking();

    // Pre-fill with current booking date/time
    useEffect(() => {
      if (booking?.startTime) {
        const bookingDate = new Date(booking.startTime);
        if (!Number.isNaN(bookingDate.getTime())) {
          setSelectedDateTime(bookingDate);
          setReason("");
        }
      }
    }, [booking?.startTime]);

    // Notify parent of saving state changes
    useEffect(() => {
      onSavingChange?.(isSaving);
    }, [isSaving, onSavingChange]);

    const handleSubmit = useCallback(() => {
      if (!booking || isSaving) return;

      // Validate the date is in the future
      if (selectedDateTime <= new Date()) {
        showErrorAlert("Error", "Please select a future date and time");
        return;
      }

      // Extract conditional values for React Compiler optimization
      const trimmedReason = reason.trim();
      const reschedulingReason = trimmedReason.length > 0 ? trimmedReason : undefined;
      const startTime = selectedDateTime.toISOString();

      rescheduleBooking(
        {
          uid: booking.uid,
          start: startTime,
          reschedulingReason,
        },
        {
          onSuccess: () => {
            if (Platform.OS === "web") {
              showSuccessAlert("Success", "Booking rescheduled successfully");
              onSuccess();
            } else {
              Alert.alert("Success", "Booking rescheduled successfully", [
                { text: "OK", onPress: onSuccess },
              ]);
            }
          },
          onError: (error) => {
            safeLogError("[RescheduleScreen] Failed to reschedule:", error);
            showErrorAlert("Error", "Failed to reschedule booking. Please try again.");
          },
        }
      );
    }, [booking, selectedDateTime, reason, onSuccess, isSaving, rescheduleBooking]);

    // Helper function to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
    const formatLocalDate = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    };

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

    // Generate date options for picker (next 90 days)
    // Note: useMemo must be called before any conditional returns to follow React hooks rules
    const dateOptions = React.useMemo(() => {
      const options: { label: string; value: Date }[] = [];
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
      const options: {
        label: string;
        value: { hour: number; minute: number };
      }[] = [];
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
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: transparentBackground ? "transparent" : colors.background }}
        >
          <Text style={{ color: colors.textSecondary }}>No booking data</Text>
        </View>
      );
    }

    return (
      <>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            {/* Booking Title Card */}
            {!transparentBackground && (
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
            )}

            {/* Form - Separate cards for transparent mode, grouped for non-transparent */}
            {transparentBackground ? (
              <>
                {/* Date picker - pill button */}
                {!isWeb && (
                  <View className="mb-3 flex-row items-center">
                    <Text
                      className="mr-3 text-[15px] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      Date
                    </Text>
                    <TouchableOpacity
                      className="rounded-xl px-4 py-2.5"
                      style={{
                        borderWidth: 1,
                        borderColor: colors.inputBorder,
                        backgroundColor: colors.inputBackground,
                      }}
                      onPress={() => {
                        safeLogInfo("[RescheduleScreen] Opening date picker");
                        setShowDatePicker(true);
                      }}
                      disabled={isSaving}
                      activeOpacity={0.7}
                    >
                      <Text className="text-[17px] font-medium" style={{ color: colors.text }}>
                        {formattedDate}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Time picker - pill button */}
                {!isWeb && (
                  <View className="mb-3 flex-row items-center">
                    <Text
                      className="mr-3 text-[15px] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      Time
                    </Text>
                    <TouchableOpacity
                      className="rounded-xl px-4 py-2.5"
                      style={{
                        borderWidth: 1,
                        borderColor: colors.inputBorder,
                        backgroundColor: colors.inputBackground,
                      }}
                      onPress={() => {
                        safeLogInfo("[RescheduleScreen] Opening time picker");
                        setShowTimePicker(true);
                      }}
                      disabled={isSaving}
                      activeOpacity={0.7}
                    >
                      <Text className="text-[17px] font-medium" style={{ color: colors.text }}>
                        {formattedTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Reason input */}
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
                    placeholder="Reason for rescheduling (optional)..."
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
              <View
                className="mb-4 overflow-hidden rounded-xl"
                style={{ backgroundColor: colors.cardBackground }}
              >
                {/* Date picker */}
                {isWeb ? (
                  <View
                    className="px-4 py-3"
                    style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                  >
                    <Text
                      className="mb-1.5 text-[13px] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      New Date
                    </Text>
                    <input
                      type="date"
                      value={formatLocalDate(selectedDateTime)}
                      onChange={(e) => {
                        const [year, month, day] = e.target.value.split("-").map(Number);
                        if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
                          const newDate = new Date(selectedDateTime);
                          newDate.setFullYear(year, month - 1, day);
                          safeLogInfo("[RescheduleScreen] Date selected:", newDate);
                          setSelectedDateTime(newDate);
                        }
                      }}
                      disabled={isSaving}
                      style={{
                        width: "100%",
                        height: 40,
                        fontSize: 17,
                        border: "none",
                        outline: "none",
                        backgroundColor: "transparent",
                        color: colors.text,
                      }}
                      min={formatLocalDate(new Date())}
                    />
                  </View>
                ) : (
                  <View
                    className="px-4 py-3"
                    style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                  >
                    <Text
                      className="mb-1.5 text-[13px] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      New Date
                    </Text>
                    <TouchableOpacity
                      className="self-start rounded-lg px-4 py-2"
                      style={{ backgroundColor: colors.pill }}
                      onPress={() => {
                        safeLogInfo("[RescheduleScreen] Opening date picker");
                        setShowDatePicker(true);
                      }}
                      disabled={isSaving}
                      activeOpacity={0.7}
                    >
                      <Text className="text-[17px] font-medium" style={{ color: colors.text }}>
                        {formattedDate}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Time picker */}
                {isWeb ? (
                  <View
                    className="px-4 py-3"
                    style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                  >
                    <Text
                      className="mb-1.5 text-[13px] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      New Time
                    </Text>
                    <input
                      type="time"
                      value={`${String(selectedDateTime.getHours()).padStart(2, "0")}:${String(
                        selectedDateTime.getMinutes()
                      ).padStart(2, "0")}`}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":").map(Number);
                        if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
                          safeLogInfo("[RescheduleScreen] Time selected:", {
                            hours,
                            minutes,
                          });
                          const newDate = new Date(selectedDateTime);
                          newDate.setHours(hours);
                          newDate.setMinutes(minutes);
                          setSelectedDateTime(newDate);
                        }
                      }}
                      disabled={isSaving}
                      style={{
                        width: "100%",
                        height: 40,
                        fontSize: 17,
                        border: "none",
                        outline: "none",
                        backgroundColor: "transparent",
                        color: colors.text,
                      }}
                    />
                  </View>
                ) : (
                  <View
                    className="px-4 py-3"
                    style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                  >
                    <Text
                      className="mb-1.5 text-[13px] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      New Time
                    </Text>
                    <TouchableOpacity
                      className="self-start rounded-lg px-4 py-2"
                      style={{ backgroundColor: colors.pill }}
                      onPress={() => {
                        safeLogInfo("[RescheduleScreen] Opening time picker");
                        setShowTimePicker(true);
                      }}
                      disabled={isSaving}
                      activeOpacity={0.7}
                    >
                      <Text className="text-[17px] font-medium" style={{ color: colors.text }}>
                        {formattedTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

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
            )}
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
              <View
                className="w-[320px] overflow-hidden rounded-2xl"
                style={{ backgroundColor: colors.cardBackground }}
              >
                <Text
                  className="py-3 text-center text-[17px] font-semibold"
                  style={{
                    color: colors.text,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  Select Date
                </Text>
                <ScrollView
                  style={{ maxHeight: 280 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {dateOptions.map((option) => {
                    const isSelected =
                      option.value.toDateString() === selectedDateTime.toDateString();
                    return (
                      <TouchableOpacity
                        key={option.value.toISOString()}
                        className="px-4 py-3"
                        style={{ backgroundColor: isSelected ? colors.selectedBg : "transparent" }}
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
                            className="text-[17px]"
                            style={{
                              fontWeight: isSelected ? "600" : "400",
                              color: isSelected ? colors.accent : colors.text,
                            }}
                          >
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark" size={22} color={colors.accent} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  className="py-3"
                  style={{ borderTopWidth: 1, borderTopColor: colors.border }}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text
                    className="text-center text-[17px] font-semibold"
                    style={{ color: colors.accent }}
                  >
                    Done
                  </Text>
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
              <View
                className="w-[320px] overflow-hidden rounded-2xl"
                style={{ backgroundColor: colors.cardBackground }}
              >
                <Text
                  className="py-3 text-center text-[17px] font-semibold"
                  style={{
                    color: colors.text,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  Select Time
                </Text>
                <ScrollView
                  style={{ maxHeight: 280 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  {timeOptions.map((option) => {
                    const isSelected =
                      selectedDateTime.getHours() === option.value.hour &&
                      selectedDateTime.getMinutes() === option.value.minute;
                    return (
                      <TouchableOpacity
                        key={option.label}
                        className="px-4 py-3"
                        style={{ backgroundColor: isSelected ? colors.selectedBg : "transparent" }}
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
                            className="text-[17px]"
                            style={{
                              fontWeight: isSelected ? "600" : "400",
                              color: isSelected ? colors.accent : colors.text,
                            }}
                          >
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark" size={22} color={colors.accent} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  className="py-3"
                  style={{ borderTopWidth: 1, borderTopColor: colors.border }}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text
                    className="text-center text-[17px] font-semibold"
                    style={{ color: colors.accent }}
                  >
                    Done
                  </Text>
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
