import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BookingActionsModal } from "@/components/BookingActionsModal";
import { FullScreenModal } from "@/components/FullScreenModal";
import type { Booking, EventType } from "@/services/calcom";
import { showInfoAlert } from "@/utils/alerts";
import { type BookingActionsResult, getBookingActions } from "@/utils/booking-actions";

// Empty actions result for when no booking is selected
const EMPTY_ACTIONS: BookingActionsResult = {
  reschedule: { visible: false, enabled: false },
  rescheduleRequest: { visible: false, enabled: false },
  cancel: { visible: false, enabled: false },
  changeLocation: { visible: false, enabled: false },
  addGuests: { visible: false, enabled: false },
  viewRecordings: { visible: false, enabled: false },
  meetingSessionDetails: { visible: false, enabled: false },
  markNoShow: { visible: false, enabled: false },
};

interface BookingModalsProps {
  // Reschedule modal props
  showRescheduleModal: boolean;
  rescheduleBooking: Booking | null;
  isRescheduling: boolean;
  onRescheduleClose: () => void;
  onRescheduleSubmit: (date: string, time: string, reason?: string) => Promise<void>;

  // Reject modal props
  showRejectModal: boolean;
  rejectReason: string;
  isDeclining: boolean;
  onRejectClose: () => void;
  onRejectSubmit: (reason?: string) => void;
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

  // User info for action gating (optional)
  currentUserEmail?: string;

  // Action modal handlers (optional - if not provided, actions will be disabled)
  onEditLocation?: (booking: Booking) => void;
  onAddGuests?: (booking: Booking) => void;
  onViewRecordings?: (booking: Booking) => void;
  onMeetingSessionDetails?: (booking: Booking) => void;
  onMarkNoShow?: (booking: Booking) => void;
}

export const BookingModals: React.FC<BookingModalsProps> = ({
  showRescheduleModal: _showRescheduleModal,
  rescheduleBooking: _rescheduleBooking,
  isRescheduling: _isRescheduling,
  onRescheduleClose: _onRescheduleClose,
  onRescheduleSubmit: _onRescheduleSubmit,
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
  currentUserEmail,
  onEditLocation,
  onAddGuests,
  onViewRecordings,
  onMeetingSessionDetails,
  onMarkNoShow,
}) => {
  // Compute actions using centralized gating
  const actions = useMemo(() => {
    if (!selectedBooking) return EMPTY_ACTIONS;
    return getBookingActions({
      booking: selectedBooking,
      eventType: undefined, // EventType not available in this context
      currentUserId: undefined,
      currentUserEmail: currentUserEmail,
      isOnline: true, // Assume online for now
    });
  }, [selectedBooking, currentUserEmail]);

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
                        className={`text-base text-[#333] ${
                          selectedEventTypeId === eventType.id ? "font-semibold" : ""
                        }`}
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
        actions={actions}
        onReschedule={onReschedule}
        onEditLocation={() => {
          if (selectedBooking && onEditLocation) {
            onEditLocation(selectedBooking);
          }
        }}
        onAddGuests={() => {
          if (selectedBooking && onAddGuests) {
            onAddGuests(selectedBooking);
          }
        }}
        onViewRecordings={() => {
          if (selectedBooking && onViewRecordings) {
            onViewRecordings(selectedBooking);
          }
        }}
        onMeetingSessionDetails={() => {
          if (selectedBooking && onMeetingSessionDetails) {
            onMeetingSessionDetails(selectedBooking);
          }
        }}
        onMarkNoShow={() => {
          if (selectedBooking && onMarkNoShow) {
            onMarkNoShow(selectedBooking);
          }
        }}
        onReportBooking={() => {
          showInfoAlert("Report Booking", "Report booking functionality is not yet available");
        }}
        onCancelBooking={onCancel}
      />

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
                  onPress={() => onRejectSubmit()}
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
