import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";

import type { Booking, EventType } from "../../services/calcom";
import { FullScreenModal } from "../FullScreenModal";
import { BookingActionsModal } from "../BookingActionsModal";

interface BookingModalsProps {
  // Reschedule modal props
  showRescheduleModal: boolean;
  rescheduleBooking: Booking | null;
  rescheduleDate: string;
  rescheduleTime: string;
  rescheduleReason: string;
  isRescheduling: boolean;
  onRescheduleClose: () => void;
  onRescheduleSubmit: () => void;
  onRescheduleDateChange: (date: string) => void;
  onRescheduleTimeChange: (time: string) => void;
  onRescheduleReasonChange: (reason: string) => void;

  // Reject modal props
  showRejectModal: boolean;
  rejectReason: string;
  isDeclining: boolean;
  onRejectClose: () => void;
  onRejectSubmit: () => void;
  onRejectReasonChange: (reason: string) => void;

  // Filter modal props (optional for iOS)
  showFilterModal?: boolean;
  eventTypes?: EventType[];
  eventTypesLoading?: boolean;
  selectedEventTypeId?: number | null;
  onFilterClose?: () => void;
  onEventTypeSelect?: (id: number | null, label?: string | null) => void;

  // Booking actions modal props
  showBookingActionsModal: boolean;
  selectedBooking: Booking | null;
  onActionsClose: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}

export const BookingModals: React.FC<BookingModalsProps> = ({
  showRescheduleModal,
  rescheduleBooking,
  rescheduleDate,
  rescheduleTime,
  rescheduleReason,
  isRescheduling,
  onRescheduleClose,
  onRescheduleSubmit,
  onRescheduleDateChange,
  onRescheduleTimeChange,
  onRescheduleReasonChange,
  showRejectModal,
  rejectReason,
  isDeclining,
  onRejectClose,
  onRejectSubmit,
  onRejectReasonChange,
  showFilterModal,
  eventTypes,
  eventTypesLoading,
  selectedEventTypeId,
  onFilterClose,
  onEventTypeSelect,
  showBookingActionsModal,
  selectedBooking,
  onActionsClose,
  onReschedule,
  onCancel,
}) => {
  return (
    <>
      {/* Filter Modal - Only rendered if props are provided (non-iOS) */}
      {showFilterModal !== undefined && onFilterClose && onEventTypeSelect ? (
        <FullScreenModal
          visible={showFilterModal}
          animationType="fade"
          onRequestClose={onFilterClose}
        >
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.5)]"
            activeOpacity={1}
            onPress={onFilterClose}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              className="w-[85%] max-w-[350px] rounded-2xl bg-white p-5"
            >
              <Text className="mb-4 text-center text-lg font-semibold text-[#333]">
                Filter by Event Type
              </Text>

              {eventTypesLoading ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color="#333" />
                  <Text className="mt-2 text-sm text-[#666]">Loading event types...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: 400 }}>
                  {eventTypes?.map((eventType) => (
                    <TouchableOpacity
                      key={eventType.id}
                      className={`mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                        selectedEventTypeId === eventType.id ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => onEventTypeSelect(eventType.id, eventType.title)}
                    >
                      <Text
                        className={`text-base text-[#333] ${selectedEventTypeId === eventType.id ? "font-semibold" : ""}`}
                      >
                        {eventType.title}
                      </Text>
                      {selectedEventTypeId === eventType.id ? (
                        <Ionicons name="checkmark" size={20} color="#000" />
                      ) : null}
                    </TouchableOpacity>
                  ))}

                  {eventTypes?.length === 0 ? (
                    <View className="items-center py-4">
                      <Text className="text-sm text-[#666]">No event types found</Text>
                    </View>
                  ) : null}
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </FullScreenModal>
      ) : null}

      {/* Booking Actions Modal */}
      <BookingActionsModal
        visible={showBookingActionsModal}
        onClose={onActionsClose}
        booking={selectedBooking}
        hasLocationUrl={!!selectedBooking?.location}
        isUpcoming={
          selectedBooking
            ? new Date(selectedBooking.endTime || selectedBooking.end || "") >= new Date() &&
              selectedBooking.status?.toUpperCase() !== "PENDING"
            : false
        }
        isPast={
          selectedBooking
            ? new Date(selectedBooking.endTime || selectedBooking.end || "") < new Date()
            : false
        }
        isCancelled={selectedBooking?.status?.toUpperCase() === "CANCELLED"}
        isUnconfirmed={selectedBooking?.status?.toUpperCase() === "PENDING"}
        onReschedule={onReschedule}
        onEditLocation={() => {
          Alert.alert("Edit Location", "Edit location functionality coming soon");
        }}
        onAddGuests={() => {
          Alert.alert("Add Guests", "Add guests functionality coming soon");
        }}
        onViewRecordings={() => {
          Alert.alert("View Recordings", "View recordings functionality coming soon");
        }}
        onMeetingSessionDetails={() => {
          Alert.alert(
            "Meeting Session Details",
            "Meeting session details functionality coming soon"
          );
        }}
        onMarkNoShow={() => {
          Alert.alert("Mark as No-Show", "Mark as no-show functionality coming soon");
        }}
        onReportBooking={() => {
          Alert.alert("Report Booking", "Report booking functionality coming soon");
        }}
        onCancelBooking={onCancel}
      />

      {/* Reschedule Modal */}
      <FullScreenModal visible={showRescheduleModal} onRequestClose={onRescheduleClose}>
        <ScrollView className="flex-1 p-4">
          {rescheduleBooking ? (
            <>
              <Text className="mb-4 text-base text-gray-600">
                Reschedule "{rescheduleBooking.title}"
              </Text>

              {/* Date Input */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  New Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  value={rescheduleDate}
                  onChangeText={onRescheduleDateChange}
                  placeholder="2024-12-25"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="default"
                />
              </View>

              {/* Time Input */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  New Time (HH:MM, 24-hour format)
                </Text>
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  value={rescheduleTime}
                  onChangeText={onRescheduleTimeChange}
                  placeholder="14:30"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="default"
                />
              </View>

              {/* Reason Input */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-gray-700">Reason (optional)</Text>
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  value={rescheduleReason}
                  onChangeText={onRescheduleReasonChange}
                  placeholder="Enter reason for rescheduling..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 80 }}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className={`rounded-lg p-4 ${isRescheduling ? "bg-gray-400" : "bg-black"}`}
                onPress={onRescheduleSubmit}
                disabled={isRescheduling}
              >
                {isRescheduling ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    Reschedule Booking
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                className="mt-3 rounded-lg bg-gray-100 p-4"
                onPress={onRescheduleClose}
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </FullScreenModal>

      {/* Reject Booking Modal */}
      <FullScreenModal
        visible={showRejectModal}
        animationType="fade"
        onRequestClose={onRejectClose}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-4"
          activeOpacity={1}
          onPress={onRejectClose}
        >
          <TouchableOpacity
            className="w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-5">
              {/* Title */}
              <Text className="mb-1 text-lg font-semibold text-gray-900">
                Reject the booking request?
              </Text>

              {/* Description */}
              <Text className="mb-4 text-sm text-gray-500">
                Are you sure you want to reject the booking? We'll let the person who tried to book
                know. You can provide a reason below.
              </Text>

              {/* Reason Input */}
              <View className="mb-5">
                <Text className="mb-1.5 text-sm text-gray-700">
                  Reason for rejecting <Text className="font-normal text-gray-400">(Optional)</Text>
                </Text>
                <TextInput
                  className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm"
                  value={rejectReason}
                  onChangeText={onRejectReasonChange}
                  placeholder="Enter reason..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 70 }}
                />
              </View>

              {/* Separator */}
              <View className="mb-4 h-px bg-gray-200" />

              {/* Buttons Row */}
              <View className="flex-row justify-end" style={{ gap: 8 }}>
                {/* Close Button */}
                <TouchableOpacity
                  className="rounded-md border border-gray-300 bg-white px-4 py-2"
                  onPress={onRejectClose}
                >
                  <Text className="text-sm font-medium text-gray-700">Close</Text>
                </TouchableOpacity>

                {/* Reject Button */}
                <TouchableOpacity
                  className="rounded-md bg-gray-900 px-4 py-2"
                  onPress={onRejectSubmit}
                  disabled={isDeclining}
                  style={{ opacity: isDeclining ? 0.5 : 1 }}
                >
                  <Text className="text-sm font-medium text-white">Reject the booking</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>
    </>
  );
};
