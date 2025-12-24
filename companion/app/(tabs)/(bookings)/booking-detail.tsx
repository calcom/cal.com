import {
  AddGuestsModal,
  EditLocationModal,
  ViewRecordingsModal,
  MeetingSessionDetailsModal,
  MarkNoShowModal,
} from "../../../components/booking-action-modals";
import { BookingDetailScreen } from "../../../components/screens/BookingDetailScreen";
import { useBookingActionModals } from "../../../hooks";
import { CalComAPIService, type Booking } from "../../../services/calcom";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";

export default function BookingDetail() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);

  // Fetch booking data for the iOS header menu actions
  useEffect(() => {
    if (uid) {
      CalComAPIService.getBookingByUid(uid)
        .then(setBooking)
        .catch(() => {
          // Error handling is done in BookingDetailScreen
        });
    }
  }, [uid]);

  // Booking action modals hook
  const {
    showAddGuestsModal,
    isAddingGuests,
    openAddGuestsModal,
    closeAddGuestsModal,
    handleAddGuests: submitAddGuests,
    showEditLocationModal,
    isUpdatingLocation,
    openEditLocationModal,
    closeEditLocationModal,
    handleUpdateLocation,
    showViewRecordingsModal,
    isLoadingRecordings,
    recordings,
    openViewRecordingsModal,
    closeViewRecordingsModal,
    showMeetingSessionDetailsModal,
    isLoadingSessions,
    sessions,
    openMeetingSessionDetailsModal,
    closeMeetingSessionDetailsModal,
    showMarkNoShowModal,
    isMarkingNoShow,
    openMarkNoShowModal,
    closeMarkNoShowModal,
    handleMarkNoShow: submitMarkNoShow,
    selectedBooking: actionModalBooking,
  } = useBookingActionModals();

  // Action handlers that use the booking data
  const handleReschedule = useCallback(() => {
    // Reschedule is handled by BookingDetailScreen's internal modal
    // For iOS header menu, we show an alert directing user to use the actions modal
    Alert.alert(
      "Reschedule Booking",
      "Please use the actions menu in the booking details to reschedule."
    );
  }, []);

  const handleEditLocation = useCallback(() => {
    if (booking) {
      openEditLocationModal(booking);
    }
  }, [booking, openEditLocationModal]);

  const handleAddGuests = useCallback(() => {
    if (booking) {
      openAddGuestsModal(booking);
    }
  }, [booking, openAddGuestsModal]);

  const handleViewRecordings = useCallback(() => {
    if (booking) {
      openViewRecordingsModal(booking);
    }
  }, [booking, openViewRecordingsModal]);

  const handleSessionDetails = useCallback(() => {
    if (booking) {
      openMeetingSessionDetailsModal(booking);
    }
  }, [booking, openMeetingSessionDetailsModal]);

  const handleMarkNoShow = useCallback(() => {
    if (booking) {
      openMarkNoShowModal(booking);
    }
  }, [booking, openMarkNoShowModal]);

  const handleReport = useCallback(() => {
    Alert.alert("Report Booking", "Report booking functionality is not yet available");
  }, []);

  const handleCancel = useCallback(() => {
    Alert.alert("Cancel Event", "Please use the actions menu in the booking details to cancel.");
  }, []);

  // Define booking actions organized by sections
  const bookingActionsSections = useMemo(
    () => ({
      editEvent: [
        {
          id: "reschedule",
          label: "Reschedule Booking",
          icon: "calendar" as const,
          onPress: handleReschedule,
        },
        {
          id: "edit-location",
          label: "Edit Location",
          icon: "location" as const,
          onPress: handleEditLocation,
        },
        {
          id: "add-guests",
          label: "Add Guests",
          icon: "person.badge.plus" as const,
          onPress: handleAddGuests,
        },
      ],
      afterEvent: [
        {
          id: "view-recordings",
          label: "View Recordings",
          icon: "video" as const,
          onPress: handleViewRecordings,
        },
        {
          id: "session-details",
          label: "Meeting Session Details",
          icon: "info.circle" as const,
          onPress: handleSessionDetails,
        },
        {
          id: "mark-no-show",
          label: "Mark as No-Show",
          icon: "eye.slash" as const,
          onPress: handleMarkNoShow,
        },
      ],
      standalone: [
        {
          id: "report",
          label: "Report Booking",
          icon: "flag" as const,
          onPress: handleReport,
          destructive: true,
        },
        {
          id: "cancel",
          label: "Cancel Event",
          icon: "xmark.circle" as const,
          onPress: handleCancel,
          destructive: true,
        },
      ],
    }),
    [
      handleReschedule,
      handleEditLocation,
      handleAddGuests,
      handleViewRecordings,
      handleSessionDetails,
      handleMarkNoShow,
      handleReport,
      handleCancel,
    ]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <Stack.Header style={{ shadowColor: "transparent" }}>
        <Stack.Header.Title>Booking Details</Stack.Header.Title>

        {/* Header right and left API only works on iOS ATM see: https://docs.expo.dev/versions/unversioned/sdk/router/#stackheaderright */}
        <Stack.Header.Right>
          <Stack.Header.Menu>
            <Stack.Header.Label>Actions</Stack.Header.Label>
            <Stack.Header.Icon sf="ellipsis" />

            {/* Edit Event Section */}
            <Stack.Header.Menu inline title="Edit Event">
              {bookingActionsSections.editEvent.map((action) => (
                <Stack.Header.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={action.onPress}
                >
                  {action.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>

            {/* After Event Section */}
            <Stack.Header.Menu inline title="After Event">
              {bookingActionsSections.afterEvent.map((action) => (
                <Stack.Header.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={action.onPress}
                >
                  {action.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>

            {/* Danger Zone Submenu */}
            <Stack.Header.Menu inline title="Danger Zone">
              {bookingActionsSections.standalone.map((action) => (
                <Stack.Header.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={action.onPress}
                  destructive
                >
                  {action.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>
          </Stack.Header.Menu>
        </Stack.Header.Right>
      </Stack.Header>

      <BookingDetailScreen uid={uid} />

      {/* Action Modals for iOS header menu */}
      <AddGuestsModal
        visible={showAddGuestsModal}
        onClose={closeAddGuestsModal}
        onSubmit={submitAddGuests}
        isLoading={isAddingGuests}
      />
      <EditLocationModal
        visible={showEditLocationModal}
        onClose={closeEditLocationModal}
        onSubmit={handleUpdateLocation}
        isLoading={isUpdatingLocation}
      />
      <ViewRecordingsModal
        visible={showViewRecordingsModal}
        onClose={closeViewRecordingsModal}
        recordings={recordings}
        isLoading={isLoadingRecordings}
      />
      <MeetingSessionDetailsModal
        visible={showMeetingSessionDetailsModal}
        onClose={closeMeetingSessionDetailsModal}
        sessions={sessions}
        isLoading={isLoadingSessions}
      />
      <MarkNoShowModal
        visible={showMarkNoShowModal}
        onClose={closeMarkNoShowModal}
        onSubmit={submitMarkNoShow}
        isLoading={isMarkingNoShow}
        attendees={actionModalBooking?.attendees ?? []}
      />
    </>
  );
}
