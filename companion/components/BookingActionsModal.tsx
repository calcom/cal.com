/**
 * BookingActionsModal Component
 *
 * A reusable modal component for booking actions that can be used in both
 * the bookings list screen and the booking detail screen.
 *
 * This component uses the centralized action gating utility for consistent
 * action visibility and enabled state across the app.
 */
import type { Booking } from "../services/calcom";
import type { BookingActionsResult } from "../utils/booking-actions";
import { FullScreenModal } from "./FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export interface BookingActionsModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking | null;
  actions: BookingActionsResult;
  onReschedule: () => void;
  onRequestReschedule?: () => void;
  onEditLocation: () => void;
  onAddGuests: () => void;
  onViewRecordings: () => void;
  onMeetingSessionDetails: () => void;
  onMarkNoShow: () => void;
  onReportBooking: () => void;
  onCancelBooking: () => void;
}

// Style constants for easy customization
const ICON_SIZE = 16;
const ICON_COLOR = "#6B7280";
const ICON_COLOR_DANGER = "#800000"; // Maroon
const DISABLED_ICON_COLOR = "#D1D5DB";
const TEXT_CLASS = "text-lg";
const TEXT_COLOR_CLASS = "text-gray-900";
const TEXT_COLOR_DANGER_CLASS = "text-[#800000]"; // Maroon
const DISABLED_TEXT_COLOR_CLASS = "text-gray-300";

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  visible: boolean;
  enabled: boolean;
  isDanger?: boolean;
}

function ActionButton({
  icon,
  label,
  onPress,
  visible,
  enabled,
  isDanger = false,
}: ActionButtonProps) {
  if (!visible) return null;

  const iconColor = !enabled ? DISABLED_ICON_COLOR : isDanger ? ICON_COLOR_DANGER : ICON_COLOR;

  const textColorClass = !enabled
    ? DISABLED_TEXT_COLOR_CLASS
    : isDanger
    ? TEXT_COLOR_DANGER_CLASS
    : TEXT_COLOR_CLASS;

  return (
    <TouchableOpacity
      onPress={() => {
        if (!enabled) return;
        onPress();
      }}
      disabled={!enabled}
      className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
    >
      <Ionicons name={icon} size={ICON_SIZE} color={iconColor} />
      <Text className={`ml-3 ${TEXT_CLASS} ${textColorClass}`}>{label}</Text>
    </TouchableOpacity>
  );
}

export function BookingActionsModal({
  visible,
  onClose,
  booking,
  actions,
  onReschedule,
  onRequestReschedule,
  onEditLocation,
  onAddGuests,
  onViewRecordings,
  onMeetingSessionDetails,
  onMarkNoShow,
  onReportBooking,
  onCancelBooking,
}: BookingActionsModalProps) {
  if (!booking) return null;

  const handleAction = (action: () => void) => {
    onClose();
    action();
  };

  // Check if any edit event actions are visible
  const hasEditEventActions =
    actions.reschedule.visible ||
    actions.rescheduleRequest.visible ||
    actions.changeLocation.visible ||
    actions.addGuests.visible;

  // Check if any after event actions are visible
  const hasAfterEventActions =
    actions.viewRecordings.visible ||
    actions.meetingSessionDetails.visible ||
    actions.markNoShow.visible;

  return (
    <FullScreenModal visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          className="mx-4 w-full max-w-sm rounded-2xl bg-white"
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Actions List */}
          <View className="p-2">
            {/* Edit event section */}
            {hasEditEventActions && (
              <>
                <View className="px-4 py-1">
                  <Text className="text-xs font-medium text-gray-500">Edit event</Text>
                </View>

                {/* Reschedule Booking */}
                <ActionButton
                  icon="calendar-outline"
                  label="Reschedule Booking"
                  onPress={() => handleAction(onReschedule)}
                  visible={actions.reschedule.visible}
                  enabled={actions.reschedule.enabled}
                />

                {/* Request Reschedule (for organizers) */}
                {onRequestReschedule && (
                  <ActionButton
                    icon="send-outline"
                    label="Request Reschedule"
                    onPress={() => handleAction(onRequestReschedule)}
                    visible={actions.rescheduleRequest.visible}
                    enabled={actions.rescheduleRequest.enabled}
                  />
                )}

                {/* Edit Location */}
                <ActionButton
                  icon="location-outline"
                  label="Edit Location"
                  onPress={() => handleAction(onEditLocation)}
                  visible={actions.changeLocation.visible}
                  enabled={actions.changeLocation.enabled}
                />

                {/* Add Guests */}
                <ActionButton
                  icon="person-add-outline"
                  label="Add Guests"
                  onPress={() => handleAction(onAddGuests)}
                  visible={actions.addGuests.visible}
                  enabled={actions.addGuests.enabled}
                />

                {/* Separator */}
                <View className="mx-4 my-2 h-px bg-gray-200" />
              </>
            )}

            {/* After event section */}
            {hasAfterEventActions && (
              <>
                <View className="px-4 py-1">
                  <Text className="text-xs font-medium text-gray-500">After event</Text>
                </View>

                {/* View Recordings */}
                <ActionButton
                  icon="videocam-outline"
                  label="View Recordings"
                  onPress={() => handleAction(onViewRecordings)}
                  visible={actions.viewRecordings.visible}
                  enabled={actions.viewRecordings.enabled}
                />

                {/* Meeting Session Details */}
                <ActionButton
                  icon="information-circle-outline"
                  label="Meeting Session Details"
                  onPress={() => handleAction(onMeetingSessionDetails)}
                  visible={actions.meetingSessionDetails.visible}
                  enabled={actions.meetingSessionDetails.enabled}
                />

                {/* Mark as No-Show */}
                <ActionButton
                  icon="eye-off-outline"
                  label="Mark as No-Show"
                  onPress={() => handleAction(onMarkNoShow)}
                  visible={actions.markNoShow.visible}
                  enabled={actions.markNoShow.enabled}
                />

                {/* Separator */}
                <View className="mx-4 my-2 h-px bg-gray-200" />
              </>
            )}

            {/* Report Booking - always visible */}
            <ActionButton
              icon="flag-outline"
              label="Report Booking"
              onPress={() => handleAction(onReportBooking)}
              visible={true}
              enabled={true}
              isDanger
            />

            {/* Separator */}
            <View className="mx-4 my-2 h-px bg-gray-200" />

            {/* Cancel Booking */}
            <ActionButton
              icon="close-circle-outline"
              label="Cancel Event"
              onPress={() => handleAction(onCancelBooking)}
              visible={actions.cancel.visible}
              enabled={actions.cancel.enabled}
              isDanger
            />
          </View>

          {/* Cancel button */}
          <View className="border-t border-gray-200 p-2 md:p-4">
            <TouchableOpacity className="w-full rounded-lg bg-gray-100 p-3" onPress={onClose}>
              <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </FullScreenModal>
  );
}
