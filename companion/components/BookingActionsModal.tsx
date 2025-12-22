/**
 * BookingActionsModal Component
 *
 * A reusable modal component for booking actions that can be used in both
 * the bookings list screen and the booking detail screen.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";

import { FullScreenModal } from "./FullScreenModal";
import type { Booking } from "../services/calcom";

export interface BookingActionsModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking | null;
  hasLocationUrl?: boolean;
  isUpcoming?: boolean; // When true, disables "after event" actions (View Recordings, Session Details, Mark No-Show)
  isPast?: boolean; // When true, disables "edit event" actions (Reschedule, Edit Location, Add Guests) and Cancel Booking
  isCancelled?: boolean; // When true, only Report Booking and Mark as No-Show are enabled
  isUnconfirmed?: boolean; // When true, disables Reschedule, Edit Location, Add Guests
  onReschedule: () => void;
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

export function BookingActionsModal({
  visible,
  onClose,
  booking,
  hasLocationUrl = false,
  isUpcoming = false,
  isPast = false,
  isCancelled = false,
  isUnconfirmed = false,
  onReschedule,
  onEditLocation,
  onAddGuests,
  onViewRecordings,
  onMeetingSessionDetails,
  onMarkNoShow,
  onReportBooking,
  onCancelBooking,
}: BookingActionsModalProps) {
  if (!booking) return null;

  // For cancelled bookings, only Report Booking and Mark as No-Show are enabled
  // "After event" actions (except Mark as No-Show) are disabled for upcoming, cancelled, or unconfirmed bookings
  const afterEventActionsDisabled = isUpcoming || isCancelled || isUnconfirmed;
  // "Edit event" actions (Reschedule, Edit Location, Add Guests) are disabled for past, cancelled, or unconfirmed bookings
  const editEventActionsDisabled = isPast || isCancelled || isUnconfirmed;
  // Cancel booking is disabled for past or cancelled bookings (but NOT for unconfirmed - user can still cancel/decline)
  const cancelBookingDisabled = isPast || isCancelled;

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
            {/* Edit event label */}
            <View className="px-4 py-1">
              <Text className="text-xs font-medium text-gray-500">Edit event</Text>
            </View>

            {/* Reschedule Booking */}
            <TouchableOpacity
              onPress={() => {
                if (editEventActionsDisabled) return;
                onClose();
                onReschedule();
              }}
              disabled={editEventActionsDisabled}
              className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
            >
              <Ionicons
                name="calendar-outline"
                size={ICON_SIZE}
                color={editEventActionsDisabled ? DISABLED_ICON_COLOR : ICON_COLOR}
              />
              <Text
                className={`ml-3 ${TEXT_CLASS} ${editEventActionsDisabled ? DISABLED_TEXT_COLOR_CLASS : TEXT_COLOR_CLASS}`}
              >
                Reschedule Booking
              </Text>
            </TouchableOpacity>

            {/* Edit Location */}
            <TouchableOpacity
              onPress={() => {
                if (editEventActionsDisabled) return;
                onClose();
                onEditLocation();
              }}
              disabled={editEventActionsDisabled}
              className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
            >
              <Ionicons
                name="location-outline"
                size={ICON_SIZE}
                color={editEventActionsDisabled ? DISABLED_ICON_COLOR : ICON_COLOR}
              />
              <Text
                className={`ml-3 ${TEXT_CLASS} ${editEventActionsDisabled ? DISABLED_TEXT_COLOR_CLASS : TEXT_COLOR_CLASS}`}
              >
                Edit Location
              </Text>
            </TouchableOpacity>

            {/* Add Guests */}
            <TouchableOpacity
              onPress={() => {
                if (editEventActionsDisabled) return;
                onClose();
                onAddGuests();
              }}
              disabled={editEventActionsDisabled}
              className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
            >
              <Ionicons
                name="person-add-outline"
                size={ICON_SIZE}
                color={editEventActionsDisabled ? DISABLED_ICON_COLOR : ICON_COLOR}
              />
              <Text
                className={`ml-3 ${TEXT_CLASS} ${editEventActionsDisabled ? DISABLED_TEXT_COLOR_CLASS : TEXT_COLOR_CLASS}`}
              >
                Add Guests
              </Text>
            </TouchableOpacity>

            {/* Separator */}
            <View className="mx-4 my-2 h-px bg-gray-200" />

            {/* After event label */}
            <View className="px-4 py-1">
              <Text className="text-xs font-medium text-gray-500">After event</Text>
            </View>

            {/* View Recordings */}
            {hasLocationUrl ? (
              <TouchableOpacity
                onPress={() => {
                  if (afterEventActionsDisabled) return;
                  onClose();
                  onViewRecordings();
                }}
                disabled={afterEventActionsDisabled}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons
                  name="videocam-outline"
                  size={ICON_SIZE}
                  color={afterEventActionsDisabled ? DISABLED_ICON_COLOR : ICON_COLOR}
                />
                <Text
                  className={`ml-3 ${TEXT_CLASS} ${afterEventActionsDisabled ? DISABLED_TEXT_COLOR_CLASS : TEXT_COLOR_CLASS}`}
                >
                  View Recordings
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Meeting Session Details */}
            {hasLocationUrl ? (
              <TouchableOpacity
                onPress={() => {
                  if (afterEventActionsDisabled) return;
                  onClose();
                  onMeetingSessionDetails();
                }}
                disabled={afterEventActionsDisabled}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons
                  name="information-circle-outline"
                  size={ICON_SIZE}
                  color={afterEventActionsDisabled ? DISABLED_ICON_COLOR : ICON_COLOR}
                />
                <Text
                  className={`ml-3 ${TEXT_CLASS} ${afterEventActionsDisabled ? DISABLED_TEXT_COLOR_CLASS : TEXT_COLOR_CLASS}`}
                >
                  Meeting Session Details
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Mark as No-Show - disabled for upcoming and unconfirmed bookings */}
            <TouchableOpacity
              onPress={() => {
                if (isUpcoming || isUnconfirmed) return;
                onClose();
                onMarkNoShow();
              }}
              disabled={isUpcoming || isUnconfirmed}
              className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
            >
              <Ionicons
                name="eye-off-outline"
                size={ICON_SIZE}
                color={isUpcoming || isUnconfirmed ? DISABLED_ICON_COLOR : ICON_COLOR}
              />
              <Text
                className={`ml-3 ${TEXT_CLASS} ${isUpcoming || isUnconfirmed ? DISABLED_TEXT_COLOR_CLASS : TEXT_COLOR_CLASS}`}
              >
                Mark as No-Show
              </Text>
            </TouchableOpacity>

            {/* Separator */}
            <View className="mx-4 my-2 h-px bg-gray-200" />

            {/* Report Booking */}
            <TouchableOpacity
              onPress={() => {
                onClose();
                onReportBooking();
              }}
              className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
            >
              <Ionicons name="flag-outline" size={ICON_SIZE} color={ICON_COLOR_DANGER} />
              <Text className={`ml-3 ${TEXT_CLASS} ${TEXT_COLOR_DANGER_CLASS}`}>
                Report Booking
              </Text>
            </TouchableOpacity>

            {/* Separator */}
            <View className="mx-4 my-2 h-px bg-gray-200" />

            {/* Cancel Booking */}
            <TouchableOpacity
              onPress={() => {
                if (cancelBookingDisabled) return;
                onClose();
                onCancelBooking();
              }}
              disabled={cancelBookingDisabled}
              className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
            >
              <Ionicons
                name="close-circle-outline"
                size={ICON_SIZE}
                color={cancelBookingDisabled ? DISABLED_ICON_COLOR : ICON_COLOR_DANGER}
              />
              <Text
                className={`ml-3 ${TEXT_CLASS} ${cancelBookingDisabled ? DISABLED_TEXT_COLOR_CLASS : TEXT_COLOR_DANGER_CLASS}`}
              >
                Cancel Event
              </Text>
            </TouchableOpacity>
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
