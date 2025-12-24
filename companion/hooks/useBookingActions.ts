import type { Booking } from "../services/calcom";
import { showErrorAlert } from "../utils/alerts";
import type { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

interface UseBookingActionsParams {
  router: ReturnType<typeof useRouter>;
  cancelMutation: (
    params: { uid: string; reason: string },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => void;
  confirmMutation: (
    params: { uid: string },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => void;
  declineMutation: (
    params: { uid: string; reason?: string },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => void;
  rescheduleMutation: (
    params: { uid: string; start: string; reschedulingReason?: string },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => void;
  isConfirming: boolean;
  isDeclining: boolean;
  isRescheduling: boolean;
}

export const useBookingActions = ({
  router,
  cancelMutation,
  confirmMutation,
  declineMutation,
  rescheduleMutation,
  isConfirming,
  isDeclining,
  isRescheduling,
}: UseBookingActionsParams) => {
  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectBooking, setRejectBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Selected booking for actions modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  /**
   * Navigate to booking detail page
   */
  const handleBookingPress = (booking: Booking) => {
    router.push({
      pathname: "/(tabs)/(bookings)/booking-detail",
      params: { uid: booking.uid },
    });
  };

  /**
   * Open reschedule modal with pre-filled data
   */
  const handleRescheduleBooking = (booking: Booking) => {
    // Pre-fill with the current booking date/time
    const currentDate = new Date(booking.startTime);
    const dateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = currentDate.toTimeString().slice(0, 5); // HH:MM

    setRescheduleBooking(booking);
    setRescheduleDate(dateStr);
    setRescheduleTime(timeStr);
    setRescheduleReason("");
    setShowRescheduleModal(true);
  };

  /**
   * Validate and submit reschedule request
   */
  const handleSubmitReschedule = () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) {
      showErrorAlert("Error", "Please enter both date and time");
      return;
    }

    // Parse the date and time
    const dateTimeStr = `${rescheduleDate}T${rescheduleTime}:00`;
    const newDateTime = new Date(dateTimeStr);

    // Validate the date
    if (isNaN(newDateTime.getTime())) {
      showErrorAlert(
        "Error",
        "Invalid date or time format. Please use YYYY-MM-DD for date and HH:MM for time."
      );
      return;
    }

    // Check if the new time is in the future
    if (newDateTime <= new Date()) {
      showErrorAlert("Error", "Please select a future date and time");
      return;
    }

    // Convert to UTC ISO string
    const startUtc = newDateTime.toISOString();

    rescheduleMutation(
      {
        uid: rescheduleBooking.uid,
        start: startUtc,
        reschedulingReason: rescheduleReason || undefined,
      },
      {
        onSuccess: () => {
          setShowRescheduleModal(false);
          setRescheduleBooking(null);
          Alert.alert("Success", "Booking rescheduled successfully");
        },
        onError: (error) => {
          showErrorAlert("Error", error.message || "Failed to reschedule booking");
        },
      }
    );
  };

  /**
   * Close reschedule modal and reset state
   */
  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleBooking(null);
  };

  /**
   * Show alert and cancel booking (iOS Alert.prompt pattern)
   */
  const handleCancelBooking = (booking: Booking) => {
    Alert.alert("Cancel Event", `Are you sure you want to cancel "${booking.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Cancel Event",
        style: "destructive",
        onPress: () => {
          // Prompt for cancellation reason
          Alert.prompt(
            "Cancellation Reason",
            "Please provide a reason for cancelling this booking:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Cancel Event",
                style: "destructive",
                onPress: (reason) => {
                  const cancellationReason = reason?.trim() || "Event cancelled by host";
                  cancelMutation(
                    { uid: booking.uid, reason: cancellationReason },
                    {
                      onSuccess: () => {
                        Alert.alert("Success", "Event cancelled successfully");
                      },
                      onError: (error) => {
                        console.error("Failed to cancel booking");
                        showErrorAlert("Error", "Failed to cancel event. Please try again.");
                      },
                    }
                  );
                },
              },
            ],
            "plain-text",
            "",
            "default"
          );
        },
      },
    ]);
  };

  /**
   * Show alert and confirm booking
   */
  const handleConfirmBooking = (booking: Booking) => {
    Alert.alert("Confirm Booking", `Are you sure you want to confirm "${booking.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          confirmMutation(
            { uid: booking.uid },
            {
              onSuccess: () => {
                Alert.alert("Success", "Booking confirmed successfully");
              },
              onError: (error) => {
                showErrorAlert("Error", error.message || "Failed to confirm booking");
              },
            }
          );
        },
      },
    ]);
  };

  /**
   * Open reject modal (used by iOS for custom modal UI)
   */
  const handleOpenRejectModal = (booking: Booking) => {
    setRejectBooking(booking);
    setRejectReason("");
    setShowRejectModal(true);
  };

  /**
   * Show alert and reject booking (Android Alert.prompt pattern)
   */
  const handleRejectBooking = (booking: Booking) => {
    Alert.alert("Decline Booking", `Are you sure you want to decline "${booking.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: () => {
          // Show optional reason input
          Alert.prompt(
            "Decline Reason",
            "Optionally provide a reason for declining (press OK to skip)",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "OK",
                onPress: (reason?: string) => {
                  declineMutation(
                    { uid: booking.uid, reason: reason || undefined },
                    {
                      onSuccess: () => {
                        Alert.alert("Success", "Booking declined successfully");
                      },
                      onError: (error) => {
                        showErrorAlert("Error", error.message || "Failed to decline booking");
                      },
                    }
                  );
                },
              },
            ],
            "plain-text",
            "",
            "default"
          );
        },
      },
    ]);
  };

  /**
   * Submit rejection with reason (used by iOS custom modal)
   */
  const handleSubmitReject = () => {
    if (!rejectBooking) return;

    declineMutation(
      { uid: rejectBooking.uid, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectBooking(null);
          setRejectReason("");
          Alert.alert("Success", "Booking rejected successfully");
        },
        onError: (error) => {
          showErrorAlert("Error", "Failed to reject booking. Please try again.");
        },
      }
    );
  };

  /**
   * Close reject modal and reset state
   */
  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setRejectBooking(null);
    setRejectReason("");
  };

  /**
   * Inline confirm handler (for use directly in JSX)
   */
  const handleInlineConfirm = (booking: Booking) => {
    confirmMutation(
      { uid: booking.uid },
      {
        onSuccess: () => {
          Alert.alert("Success", "Booking confirmed successfully");
        },
        onError: (error) => {
          showErrorAlert("Error", "Failed to confirm booking. Please try again.");
        },
      }
    );
  };

  return {
    // Reschedule state
    showRescheduleModal,
    setShowRescheduleModal,
    rescheduleBooking,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTime,
    setRescheduleTime,
    rescheduleReason,
    setRescheduleReason,

    // Reject state
    showRejectModal,
    setShowRejectModal,
    rejectBooking,
    rejectReason,
    setRejectReason,

    // Selected booking state
    selectedBooking,
    setSelectedBooking,

    // Handlers
    handleBookingPress,
    handleRescheduleBooking,
    handleSubmitReschedule,
    handleCloseRescheduleModal,
    handleCancelBooking,
    handleConfirmBooking,
    handleOpenRejectModal,
    handleRejectBooking,
    handleSubmitReject,
    handleCloseRejectModal,
    handleInlineConfirm,

    // Loading states (pass through)
    isConfirming,
    isDeclining,
    isRescheduling,
  };
};
