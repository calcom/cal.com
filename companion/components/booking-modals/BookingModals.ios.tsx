import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { BookingActionsModal } from "@/components/BookingActionsModal";
import { FullScreenModal } from "@/components/FullScreenModal";
import type { Booking, EventType } from "@/services/calcom";
import { showInfoAlert } from "@/utils/alerts";
import { type BookingActionsResult, getBookingActions } from "@/utils/booking-actions";

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
  showRescheduleModal: boolean;
  rescheduleBooking: Booking | null;
  isRescheduling: boolean;
  onRescheduleClose: () => void;
  onRescheduleSubmit: (date: string, time: string, reason?: string) => Promise<void>;

  showRejectModal: boolean;
  rejectReason: string;
  isDeclining: boolean;
  onRejectClose: () => void;
  onRejectSubmit: (reason?: string) => void;
  onRejectReasonChange: (reason: string) => void;

  showFilterModal?: boolean;
  eventTypes?: EventType[];
  eventTypesLoading?: boolean;
  selectedEventTypeId?: number | null;
  onFilterClose?: () => void;
  onEventTypeSelect?: (id: number | null, label?: string | null) => void;

  showBookingActionsModal: boolean;
  selectedBooking: Booking | null;
  onActionsClose: () => void;
  onReschedule: () => void;
  onCancel: () => void;

  currentUserEmail?: string;

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
  const actions = useMemo(() => {
    if (!selectedBooking) return EMPTY_ACTIONS;
    return getBookingActions({
      booking: selectedBooking,
      eventType: undefined,
      currentUserId: undefined,
      currentUserEmail: currentUserEmail,
      isOnline: true,
    });
  }, [selectedBooking, currentUserEmail]);

  const hasShownRejectAlert = useRef(false);

  useEffect(() => {
    if (showRejectModal && !isDeclining && !hasShownRejectAlert.current) {
      hasShownRejectAlert.current = true;
      Alert.prompt(
        "Reject the booking request?",
        "Are you sure you want to reject the booking? We'll let the person who tried to book know. You can provide a reason below.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              hasShownRejectAlert.current = false;
              onRejectClose();
            },
          },
          {
            text: "Reject",
            style: "destructive",
            onPress: (reason?: string) => {
              hasShownRejectAlert.current = false;
              // Pass reason directly to avoid race condition with state updates
              onRejectSubmit(reason);
            },
          },
        ],
        "plain-text",
        rejectReason,
        "default"
      );
    } else if (!showRejectModal) {
      hasShownRejectAlert.current = false;
    }
  }, [showRejectModal, isDeclining, onRejectClose, onRejectSubmit, rejectReason]);

  return (
    <>
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
    </>
  );
};
