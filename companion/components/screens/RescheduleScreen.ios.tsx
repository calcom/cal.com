/**
 * RescheduleScreen Component (iOS)
 *
 * iOS-specific implementation with native DatePicker for date/time selection.
 * Uses @expo/ui/swift-ui DatePicker for the native iOS picker.
 */

import { DatePicker, Host } from "@expo/ui/swift-ui";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, TextInput, View } from "react-native";
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
    const backgroundStyle = transparentBackground ? "bg-transparent" : "bg-[#F2F2F7]";
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
        <View className={`flex-1 items-center justify-center ${backgroundStyle}`}>
          <Text className="text-gray-500">No booking data</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView behavior="padding" className={`flex-1 ${backgroundStyle}`}>
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
                className="mb-4 mt-4 text-center text-[17px] font-semibold text-[#000]"
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
                <Text className="mx-2 text-[15px] text-gray-500">at</Text>
                <Host matchContents>
                  <DatePicker
                    onDateChange={handleTimeSelected}
                    displayedComponents={["hourAndMinute"]}
                    selection={selectedDateTime}
                  />
                </Host>
              </View>

              {/* Reason input */}
              <Text className="mb-2 px-1 text-[13px] font-medium text-gray-500">
                Reason (optional)
              </Text>
              <View className="mb-3 overflow-hidden rounded-xl border border-gray-300/40 bg-white/60 px-4 py-3">
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
            </>
          ) : (
            <>
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
                  <Host matchContents>
                    <DatePicker
                      onDateChange={handleDateSelected}
                      displayedComponents={["date"]}
                      selection={selectedDateTime}
                    />
                  </Host>
                </View>

                {/* Time picker */}
                <View className="border-b border-gray-100 px-4 py-3">
                  <Text className="mb-2 text-[13px] font-medium text-gray-500">New Time</Text>
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
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

export default RescheduleScreen;
