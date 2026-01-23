/**
 * useBookingActionModals Hook
 *
 * Centralized hook for managing all booking action modals and their API calls.
 * This hook is designed to be used across iOS, Android, and extension platforms.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Alert, Linking } from "react-native";
import { queryKeys } from "@/config/cache.config";
import { type Booking, CalComAPIService } from "@/services/calcom";
import type {
  AddGuestInput,
  BookingRecording,
  ConferencingSession,
} from "@/services/types/bookings.types";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";

interface UseBookingActionModalsReturn {
  // Selected booking for actions
  selectedBooking: Booking | null;
  setSelectedBooking: (booking: Booking | null) => void;

  // Add Guests Modal
  showAddGuestsModal: boolean;
  isAddingGuests: boolean;
  openAddGuestsModal: (booking: Booking) => void;
  closeAddGuestsModal: () => void;
  handleAddGuests: (guests: AddGuestInput[]) => Promise<void>;

  // Edit Location Modal
  showEditLocationModal: boolean;
  isUpdatingLocation: boolean;
  openEditLocationModal: (booking: Booking) => void;
  closeEditLocationModal: () => void;
  handleUpdateLocation: (location: string) => Promise<void>;

  // View Recordings Modal
  showViewRecordingsModal: boolean;
  isLoadingRecordings: boolean;
  recordings: BookingRecording[];
  openViewRecordingsModal: (booking: Booking) => void;
  closeViewRecordingsModal: () => void;

  // Meeting Session Details Modal
  showMeetingSessionDetailsModal: boolean;
  isLoadingSessions: boolean;
  sessions: ConferencingSession[];
  openMeetingSessionDetailsModal: (booking: Booking) => void;
  closeMeetingSessionDetailsModal: () => void;

  // Mark No-Show Modal
  showMarkNoShowModal: boolean;
  isMarkingNoShow: boolean;
  openMarkNoShowModal: (booking: Booking) => void;
  closeMarkNoShowModal: () => void;
  handleMarkNoShow: (attendeeEmail: string, absent: boolean) => Promise<void>;

  // Request Reschedule (deep link to web)
  handleRequestReschedule: (booking: Booking) => void;
}

export function useBookingActionModals(): UseBookingActionModalsReturn {
  "use no memo";
  const queryClient = useQueryClient();

  // Selected booking state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Add Guests Modal state
  const [showAddGuestsModal, setShowAddGuestsModal] = useState(false);
  const [isAddingGuests, setIsAddingGuests] = useState(false);

  // Edit Location Modal state
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // View Recordings Modal state
  const [showViewRecordingsModal, setShowViewRecordingsModal] = useState(false);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  const [recordings, setRecordings] = useState<BookingRecording[]>([]);

  // Meeting Session Details Modal state
  const [showMeetingSessionDetailsModal, setShowMeetingSessionDetailsModal] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessions, setSessions] = useState<ConferencingSession[]>([]);

  // Mark No-Show Modal state
  const [showMarkNoShowModal, setShowMarkNoShowModal] = useState(false);
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);

  // Invalidate booking queries after mutations
  const invalidateBookingQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    if (selectedBooking?.uid) {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(selectedBooking.uid) });
    }
  }, [queryClient, selectedBooking?.uid]);

  // ============================================================================
  // Add Guests
  // ============================================================================

  const openAddGuestsModal = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setShowAddGuestsModal(true);
  }, []);

  const closeAddGuestsModal = useCallback(() => {
    setShowAddGuestsModal(false);
  }, []);

  const handleAddGuests = useCallback(
    async (guests: AddGuestInput[]) => {
      if (!selectedBooking) {
        showErrorAlert("Error", "No booking selected");
        return;
      }

      setIsAddingGuests(true);
      try {
        await CalComAPIService.addGuests(selectedBooking.uid, guests);
        showSuccessAlert(
          "Success",
          "Guests added successfully. They will receive an email notification."
        );
        invalidateBookingQueries();
        closeAddGuestsModal();
        setIsAddingGuests(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add guests";
        showErrorAlert("Error", message);
        setIsAddingGuests(false);
      }
    },
    [selectedBooking, invalidateBookingQueries, closeAddGuestsModal]
  );

  // ============================================================================
  // Edit Location
  // ============================================================================

  const openEditLocationModal = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setShowEditLocationModal(true);
  }, []);

  const closeEditLocationModal = useCallback(() => {
    setShowEditLocationModal(false);
  }, []);

  const handleUpdateLocation = useCallback(
    async (location: string) => {
      if (!selectedBooking) {
        showErrorAlert("Error", "No booking selected");
        return;
      }

      setIsUpdatingLocation(true);
      try {
        await CalComAPIService.updateLocation(selectedBooking.uid, location);
        showSuccessAlert(
          "Success",
          "Location updated successfully. Note: The calendar event may not be automatically updated."
        );
        invalidateBookingQueries();
        closeEditLocationModal();
        setIsUpdatingLocation(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update location";
        showErrorAlert("Error", message);
        setIsUpdatingLocation(false);
      }
    },
    [selectedBooking, invalidateBookingQueries, closeEditLocationModal]
  );

  // ============================================================================
  // View Recordings
  // ============================================================================

  const openViewRecordingsModal = useCallback(async (booking: Booking) => {
    setSelectedBooking(booking);
    setShowViewRecordingsModal(true);
    setIsLoadingRecordings(true);
    setRecordings([]);

    try {
      const recordingsData = await CalComAPIService.getRecordings(booking.uid);
      setRecordings(recordingsData);
      setIsLoadingRecordings(false);
    } catch (error) {
      if (__DEV__) {
        console.debug("[useBookingActionModals] Failed to load recordings:", error);
      }
      showErrorAlert("Error", "Failed to load recordings. Please try again.");
      setShowViewRecordingsModal(false);
      setIsLoadingRecordings(false);
    }
  }, []);

  const closeViewRecordingsModal = useCallback(() => {
    setShowViewRecordingsModal(false);
    setRecordings([]);
  }, []);

  // ============================================================================
  // Meeting Session Details
  // ============================================================================

  const openMeetingSessionDetailsModal = useCallback(async (booking: Booking) => {
    setSelectedBooking(booking);
    setShowMeetingSessionDetailsModal(true);
    setIsLoadingSessions(true);
    setSessions([]);

    try {
      const sessionsData = await CalComAPIService.getConferencingSessions(booking.uid);
      setSessions(sessionsData);
      setIsLoadingSessions(false);
    } catch (error) {
      if (__DEV__) {
        console.debug("[useBookingActionModals] Failed to load sessions:", error);
      }
      showErrorAlert("Error", "Failed to load meeting session details. Please try again.");
      setShowMeetingSessionDetailsModal(false);
      setIsLoadingSessions(false);
    }
  }, []);

  const closeMeetingSessionDetailsModal = useCallback(() => {
    setShowMeetingSessionDetailsModal(false);
    setSessions([]);
  }, []);

  // ============================================================================
  // Mark No-Show
  // ============================================================================

  const openMarkNoShowModal = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setShowMarkNoShowModal(true);
  }, []);

  const closeMarkNoShowModal = useCallback(() => {
    setShowMarkNoShowModal(false);
  }, []);

  const handleMarkNoShow = useCallback(
    async (attendeeEmail: string, absent: boolean) => {
      if (!selectedBooking) {
        showErrorAlert("Error", "No booking selected");
        return;
      }

      setIsMarkingNoShow(true);
      try {
        await CalComAPIService.markAbsent(selectedBooking.uid, attendeeEmail, absent);
        showSuccessAlert(
          "Success",
          absent ? "Attendee marked as no-show." : "No-show status removed."
        );
        invalidateBookingQueries();
        closeMarkNoShowModal();
        setIsMarkingNoShow(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update no-show status";
        showErrorAlert("Error", message);
        setIsMarkingNoShow(false);
      }
    },
    [selectedBooking, invalidateBookingQueries, closeMarkNoShowModal]
  );

  // ============================================================================
  // Request Reschedule (deep link to web)
  // ============================================================================

  const handleRequestReschedule = useCallback((booking: Booking) => {
    // Request reschedule is a server-driven operation that requires the web app
    // We deep link to the booking detail page where the user can trigger it
    const webUrl = `https://app.cal.com/booking/${booking.uid}`;

    Alert.alert(
      "Request Reschedule",
      "This action will open the Cal.com web app where you can request a reschedule from the attendee.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open in Browser",
          onPress: () => {
            Linking.openURL(webUrl).catch(() => {
              showErrorAlert("Error", "Failed to open the web app. Please try again.");
            });
          },
        },
      ]
    );
  }, []);

  return {
    // Selected booking
    selectedBooking,
    setSelectedBooking,

    // Add Guests
    showAddGuestsModal,
    isAddingGuests,
    openAddGuestsModal,
    closeAddGuestsModal,
    handleAddGuests,

    // Edit Location
    showEditLocationModal,
    isUpdatingLocation,
    openEditLocationModal,
    closeEditLocationModal,
    handleUpdateLocation,

    // View Recordings
    showViewRecordingsModal,
    isLoadingRecordings,
    recordings,
    openViewRecordingsModal,
    closeViewRecordingsModal,

    // Meeting Session Details
    showMeetingSessionDetailsModal,
    isLoadingSessions,
    sessions,
    openMeetingSessionDetailsModal,
    closeMeetingSessionDetailsModal,

    // Mark No-Show
    showMarkNoShowModal,
    isMarkingNoShow,
    openMarkNoShowModal,
    closeMarkNoShowModal,
    handleMarkNoShow,

    // Request Reschedule
    handleRequestReschedule,
  };
}
