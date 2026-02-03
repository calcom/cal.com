/**
 * BookingActionsModal Component - Android/Web Implementation
 *
 * A reusable modal component for booking actions that can be used in both
 * the bookings list screen and the booking detail screen.
 *
 * This component uses the centralized action gating utility for consistent
 * action visibility and enabled state across the app.
 *
 * Note: iOS uses BookingActionsModal.ios.tsx with native Glass UI styling.
 */

import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { getColors } from "@/constants/colors";
import type { Booking } from "@/services/calcom";
import type { BookingActionsResult } from "@/utils/booking-actions";
import { FullScreenModal } from "./FullScreenModal";

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

// Icon mapping for actions
const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  reschedule: "calendar-outline",
  rescheduleRequest: "send-outline",
  changeLocation: "location-outline",
  addGuests: "person-add-outline",
  viewRecordings: "videocam-outline",
  meetingSessionDetails: "information-circle-outline",
  markNoShow: "eye-off-outline",
  report: "flag-outline",
  cancel: "close-circle-outline",
};

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  visible: boolean;
  enabled: boolean;
  isDanger?: boolean;
  isLast?: boolean;
}

function ActionButton({
  icon,
  label,
  onPress,
  visible,
  enabled,
  isDanger = false,
  isLast = false,
}: ActionButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  if (!visible) return null;
  const iconColor = !enabled ? "#D1D5DB" : isDanger ? theme.destructive : "#6B7280";
  const textColor = !enabled ? "#D1D5DB" : isDanger ? theme.destructive : "#111827";

  return (
    <TouchableOpacity
      onPress={() => {
        if (!enabled) return;
        onPress();
      }}
      disabled={!enabled}
      className={`flex-row items-center px-4 py-3 active:bg-gray-50 dark:active:bg-[#262626] ${
        !isLast ? "border-b border-gray-100 dark:border-[#4D4D4D]" : ""
      }`}
      activeOpacity={0.7}
    >
      <View className="mr-3 h-6 w-6 items-center justify-center">
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="flex-1 text-[16px]" style={{ color: textColor }}>
        {label}
      </Text>
      {!enabled && (
        <View className="rounded bg-gray-100 px-2 py-0.5 dark:bg-[#262626]">
          <Text className="text-xs text-gray-500 dark:text-[#A3A3A3]">Unavailable</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View className="bg-gray-50 px-4 py-2 dark:bg-[#262626]">
      <Text className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-[#A3A3A3]">
        {title}
      </Text>
    </View>
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

  // Define edit event actions
  const editEventActions = [
    {
      key: "reschedule",
      icon: ACTION_ICONS.reschedule,
      label: "Reschedule Booking",
      onPress: () => handleAction(onReschedule),
      visible: actions.reschedule.visible,
      enabled: actions.reschedule.enabled,
    },
    ...(onRequestReschedule
      ? [
          {
            key: "rescheduleRequest",
            icon: ACTION_ICONS.rescheduleRequest,
            label: "Request Reschedule",
            onPress: () => handleAction(onRequestReschedule),
            visible: actions.rescheduleRequest.visible,
            enabled: actions.rescheduleRequest.enabled,
          },
        ]
      : []),
    {
      key: "changeLocation",
      icon: ACTION_ICONS.changeLocation,
      label: "Edit Location",
      onPress: () => handleAction(onEditLocation),
      visible: actions.changeLocation.visible,
      enabled: actions.changeLocation.enabled,
    },
    {
      key: "addGuests",
      icon: ACTION_ICONS.addGuests,
      label: "Add Guests",
      onPress: () => handleAction(onAddGuests),
      visible: actions.addGuests.visible,
      enabled: actions.addGuests.enabled,
    },
  ].filter((action) => action.visible);

  // Define after event actions
  const afterEventActions = [
    {
      key: "viewRecordings",
      icon: ACTION_ICONS.viewRecordings,
      label: "View Recordings",
      onPress: () => handleAction(onViewRecordings),
      visible: actions.viewRecordings.visible,
      enabled: actions.viewRecordings.enabled,
    },
    {
      key: "meetingSessionDetails",
      icon: ACTION_ICONS.meetingSessionDetails,
      label: "Meeting Session Details",
      onPress: () => handleAction(onMeetingSessionDetails),
      visible: actions.meetingSessionDetails.visible,
      enabled: actions.meetingSessionDetails.enabled,
    },
    {
      key: "markNoShow",
      icon: ACTION_ICONS.markNoShow,
      label: "Mark as No-Show",
      onPress: () => handleAction(onMarkNoShow),
      visible: actions.markNoShow.visible,
      enabled: actions.markNoShow.enabled,
    },
  ].filter((action) => action.visible);

  // Define danger zone actions
  const dangerZoneActions = [
    {
      key: "report",
      icon: ACTION_ICONS.report,
      label: "Report Booking",
      onPress: () => handleAction(onReportBooking),
      visible: true,
      enabled: true,
      isDanger: true,
    },
    {
      key: "cancel",
      icon: ACTION_ICONS.cancel,
      label: "Cancel Event",
      onPress: () => handleAction(onCancelBooking),
      visible: actions.cancel.visible,
      enabled: actions.cancel.enabled,
      isDanger: true,
    },
  ].filter((action) => action.visible);

  return (
    <FullScreenModal visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-black/50 p-4"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          className="w-full max-w-md"
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Actions Card */}
          <View className="mb-4 overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-[#171717]">
            {/* Booking Title Header */}
            <View className="border-b border-gray-100 px-4 py-3 dark:border-[#4D4D4D]">
              <Text
                className="text-center text-[14px] font-medium text-gray-600 dark:text-[#A3A3A3]"
                numberOfLines={1}
              >
                {booking.title}
              </Text>
            </View>

            <ScrollView className="max-h-[400px]">
              {/* Edit Event Section */}
              {hasEditEventActions && (
                <>
                  <SectionHeader title="Edit Event" />
                  {editEventActions.map((action, index) => (
                    <ActionButton
                      key={action.key}
                      icon={action.icon}
                      label={action.label}
                      onPress={action.onPress}
                      visible={action.visible}
                      enabled={action.enabled}
                      isLast={index === editEventActions.length - 1}
                    />
                  ))}
                </>
              )}

              {/* After Event Section */}
              {hasAfterEventActions && (
                <>
                  <SectionHeader title="After Event" />
                  {afterEventActions.map((action, index) => (
                    <ActionButton
                      key={action.key}
                      icon={action.icon}
                      label={action.label}
                      onPress={action.onPress}
                      visible={action.visible}
                      enabled={action.enabled}
                      isLast={index === afterEventActions.length - 1}
                    />
                  ))}
                </>
              )}

              {/* Danger Zone Section */}
              {dangerZoneActions.length > 0 && (
                <>
                  <SectionHeader title="Danger Zone" />
                  {dangerZoneActions.map((action, index) => (
                    <ActionButton
                      key={action.key}
                      icon={action.icon}
                      label={action.label}
                      onPress={action.onPress}
                      visible={action.visible}
                      enabled={action.enabled}
                      isDanger={action.isDanger}
                      isLast={index === dangerZoneActions.length - 1}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-[#171717]"
            onPress={onClose}
            activeOpacity={0.7}
          >
            <View className="px-4 py-3">
              <Text className="text-center text-[16px] font-semibold text-gray-700 dark:text-white">
                Cancel
              </Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </FullScreenModal>
  );
}
