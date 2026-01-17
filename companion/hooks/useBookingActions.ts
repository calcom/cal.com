import type { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";

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

  // Cancel modal state (for Android AlertDialog)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");

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
    // Get the start time from booking (prefer startTime, fallback to start)
    const startTimeValue = booking.startTime || booking.start;

    // Validate we have a valid date
    if (!startTimeValue) {
      showErrorAlert("Error", "Unable to reschedule: booking has no start time");
      return;
    }

    const currentDate = new Date(startTimeValue);

    // Check if the date is valid
    if (Number.isNaN(currentDate.getTime())) {
      showErrorAlert("Error", "Unable to reschedule: invalid booking date");
      return;
    }

    // Use local timezone consistently (not UTC) to avoid date/time mismatch
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const minutes = String(currentDate.getMinutes()).padStart(2, "0");

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}`;

    setRescheduleBooking(booking);
    setRescheduleDate(dateStr);
    setRescheduleTime(timeStr);
    setRescheduleReason("");
    setShowRescheduleModal(true);
  };

  /**
   * Validate and submit reschedule request (uses internal state)
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
    if (Number.isNaN(newDateTime.getTime())) {
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
          showSuccessAlert("Success", "Booking rescheduled successfully");
        },
        onError: (error) => {
          showErrorAlert("Error", error.message || "Failed to reschedule booking");
        },
      }
    );
  };

  /**
   * Submit reschedule with provided values (used by RescheduleModal component)
   */
  const handleRescheduleWithValues = async (
    date: string,
    time: string,
    reason?: string
  ): Promise<void> => {
    if (!rescheduleBooking) {
      throw new Error("No booking selected");
    }

    // Parse the date and time
    const dateTimeStr = `${date}T${time}:00`;
    const newDateTime = new Date(dateTimeStr);

    // Validate the date
    if (Number.isNaN(newDateTime.getTime())) {
      throw new Error(
        "Invalid date or time format. Please use YYYY-MM-DD for date and HH:MM for time."
      );
    }

    // Check if the new time is in the future
    if (newDateTime <= new Date()) {
      throw new Error("Please select a future date and time");
    }

    // Convert to UTC ISO string
    const startUtc = newDateTime.toISOString();

    return new Promise((resolve, reject) => {
      rescheduleMutation(
        {
          uid: rescheduleBooking.uid,
          start: startUtc,
          reschedulingReason: reason || undefined,
        },
        {
          onSuccess: () => {
            setShowRescheduleModal(false);
            setRescheduleBooking(null);
            showSuccessAlert("Success", "Booking rescheduled successfully");
            resolve();
          },
          onError: (error) => {
            reject(new Error(error.message || "Failed to reschedule booking"));
          },
        }
      );
    });
  };

  /**
   * Close reschedule modal and reset state
   */
  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleBooking(null);
  };

  /**
   * Open cancel modal for Android, use Alert.prompt for iOS
   */
  const handleOpenCancelModal = (booking: Booking) => {
    setCancelBooking(booking);
    setCancelReason("");
    setShowCancelModal(true);
  };

  /**
   * Submit cancel with reason (used by Android AlertDialog)
   */
  const handleSubmitCancel = () => {
    if (!cancelBooking) return;

    const reason = cancelReason.trim() || "Event cancelled by host";

    cancelMutation(
      { uid: cancelBooking.uid, reason },
      {
        onSuccess: () => {
          setShowCancelModal(false);
          setCancelBooking(null);
          setCancelReason("");
          showSuccessAlert("Success", "Event cancelled successfully");
        },
        onError: (_error) => {
          console.error("Failed to cancel booking");
          showErrorAlert("Error", "Failed to cancel event. Please try again.");
        },
      }
    );
  };

  /**
   * Close cancel modal and reset state
   */
  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelBooking(null);
    setCancelReason("");
  };

  /**
   * Show alert and cancel booking (iOS Alert.prompt pattern, Android opens modal)
   */
  const handleCancelBooking = (booking: Booking) => {
    // For Android and Web, open the cancel modal (AlertDialog on Android, content-modal on Web)
    if (Platform.OS === "android" || Platform.OS === "web") {
      handleOpenCancelModal(booking);
      return;
    }

    // For iOS, use native Alert.prompt
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
                onPress: (reason?: string) => {
                  const cancellationReason = reason?.trim() || "Event cancelled by host";
                  cancelMutation(
                    { uid: booking.uid, reason: cancellationReason },
                    {
                      onSuccess: () => {
                        showSuccessAlert("Success", "Event cancelled successfully");
                      },
                      onError: (_error) => {
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
                showSuccessAlert("Success", "Booking confirmed successfully");
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
                        showSuccessAlert("Success", "Booking declined successfully");
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
   * @param reasonOverride - Optional reason passed directly to avoid race condition with state updates
   */
  const handleSubmitReject = (reasonOverride?: string) => {
    if (!rejectBooking) return;

    // Use passed reason if provided, otherwise fall back to state
    const reason = reasonOverride !== undefined ? reasonOverride : rejectReason;

    declineMutation(
      { uid: rejectBooking.uid, reason: reason || undefined },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectBooking(null);
          setRejectReason("");
          showSuccessAlert("Success", "Booking rejected successfully");
        },
        onError: (_error) => {
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
          showSuccessAlert("Success", "Booking confirmed successfully");
        },
        onError: (_error) => {
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

    // Cancel state (for Android AlertDialog)
    showCancelModal,
    setShowCancelModal,
    cancelBooking,
    cancelReason,
    setCancelReason,

    // Selected booking state
    selectedBooking,
    setSelectedBooking,

    // Handlers
    handleBookingPress,
    handleRescheduleBooking,
    handleSubmitReschedule,
    handleRescheduleWithValues,
    handleCloseRescheduleModal,
    handleCancelBooking,
    handleOpenCancelModal,
    handleSubmitCancel,
    handleCloseCancelModal,
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
