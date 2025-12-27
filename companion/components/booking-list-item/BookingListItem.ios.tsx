import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity, Linking, Pressable, Alert } from "react-native";
import { Host, ContextMenu, Button, Image, HStack } from "@expo/ui/swift-ui";
import { buttonStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import type { BookingListItemProps } from "./types";
import { SvgImage } from "../SvgImage";
import { getMeetingInfo } from "../../utils/meetings-utils";
import { formatTime, formatDate, getHostAndAttendeesDisplay } from "../../utils/bookings-utils";
import { showErrorAlert } from "../../utils/alerts";
import { getBookingActions } from "../../utils/booking-actions";

export const BookingListItem: React.FC<BookingListItemProps> = ({
  booking,
  userEmail,
  isConfirming,
  isDeclining,
  onPress,
  onLongPress,
  onConfirm,
  onReject,
  onActionsPress,
  onReschedule,
  onEditLocation,
  onAddGuests,
  onViewRecordings,
  onMeetingSessionDetails,
  onMarkNoShow,
  onReportBooking,
  onCancelBooking,
}) => {
  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";
  const isUpcoming = new Date(endTime) >= new Date();
  const isPending = booking.status?.toUpperCase() === "PENDING";
  const isCancelled = booking.status?.toUpperCase() === "CANCELLED";
  const isRejected = booking.status?.toUpperCase() === "REJECTED";
  const hasLocationUrl = !!booking.location;

  const hostAndAttendeesDisplay = getHostAndAttendeesDisplay(booking, userEmail);
  const meetingInfo = getMeetingInfo(booking.location);

  // Check if any attendee is marked as no-show
  const hasNoShowAttendee = booking.attendees?.some(
    (att: any) => att.noShow === true || att.absent === true
  );

  // Use centralized action gating for consistency
  const actions = React.useMemo(() => {
    return getBookingActions({
      booking,
      eventType: undefined,
      currentUserId: undefined, // Not available in this context
      currentUserEmail: userEmail,
      isOnline: true, // Assume online
    });
  }, [booking, userEmail]);

  // Define context menu actions based on booking state
  type ContextMenuAction = {
    label: string;
    icon: string;
    onPress: () => void;
    role: "default" | "destructive";
  };

  const allActions: (ContextMenuAction & { visible: boolean })[] = [
    // Edit Event Section
    {
      label: "Reschedule Booking",
      icon: "calendar",
      onPress: () => onReschedule?.(booking),
      role: "default",
      visible: isUpcoming && !isCancelled && !isPending && !!onReschedule,
    },
    {
      label: "Edit Location",
      icon: "location",
      onPress: () => onEditLocation?.(booking),
      role: "default",
      visible: isUpcoming && !isCancelled && !isPending && !!onEditLocation,
    },
    {
      label: "Add Guests",
      icon: "person.badge.plus",
      onPress: () => onAddGuests?.(booking),
      role: "default",
      visible: isUpcoming && !isCancelled && !isPending && !!onAddGuests,
    },
    // After Event Section
    {
      label: "View Recordings",
      icon: "video",
      onPress: () => onViewRecordings?.(booking),
      role: "default",
      visible:
        actions.viewRecordings.visible && actions.viewRecordings.enabled && !!onViewRecordings,
    },
    {
      label: "Meeting Session Details",
      icon: "info.circle",
      onPress: () => onMeetingSessionDetails?.(booking),
      role: "default",
      visible:
        actions.meetingSessionDetails.visible &&
        actions.meetingSessionDetails.enabled &&
        !!onMeetingSessionDetails,
    },
    {
      label: "Mark as No-Show",
      icon: "eye.slash",
      onPress: () => onMarkNoShow?.(booking),
      role: "default",
      visible: actions.markNoShow.visible && actions.markNoShow.enabled && !!onMarkNoShow,
    },
    // Other Actions
    {
      label: "Report Booking",
      icon: "flag",
      onPress: () => onReportBooking?.(booking),
      role: "destructive",
      visible: !!onReportBooking,
    },
    {
      label: "Cancel Event",
      icon: "xmark.circle",
      onPress: () => onCancelBooking?.(booking),
      role: "destructive",
      visible: isUpcoming && !isCancelled && !!onCancelBooking,
    },
  ];

  const contextMenuActions: ContextMenuAction[] = allActions
    .filter((action) => action.visible)
    .map(({ label, icon, onPress, role }) => ({ label, icon, onPress, role }));

  return (
    <View className="border-b border-[#E5E5EA] bg-white">
      <Pressable
        onPress={() => onPress(booking)}
        onLongPress={() => onLongPress(booking)}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
        className="active:bg-[#F8F9FA]"
      >
        {/* Time and Date Row */}
        <View className="mb-2 flex-row flex-wrap items-center">
          <Text className="text-sm font-medium text-[#333]">
            {formatDate(startTime, isUpcoming)}
          </Text>
          <Text className="ml-2 text-sm text-[#666]">
            {formatTime(startTime)} - {formatTime(endTime)}
          </Text>
        </View>
        {/* Badges Row */}
        <View className="mb-3 flex-row flex-wrap items-center">
          {isPending ? (
            <View className="mb-1 mr-2 rounded bg-[#FF9500] px-2 py-0.5">
              <Text className="text-xs font-medium text-white">Unconfirmed</Text>
            </View>
          ) : null}
        </View>
        {/* Title */}
        <Text
          className={`mb-2 text-lg font-medium leading-5 text-[#333] ${isCancelled || isRejected ? "line-through" : ""}`}
          numberOfLines={2}
        >
          {booking.title}
        </Text>
        {/* Description */}
        {booking.description ? (
          <Text className="mb-2 text-sm leading-5 text-[#666]" numberOfLines={1}>
            &quot;{booking.description}&quot;
          </Text>
        ) : null}
        {/* Host and Attendees */}
        {hostAndAttendeesDisplay ? (
          <View className="mb-2 flex-row items-center">
            <Text className="text-sm text-[#333]">{hostAndAttendeesDisplay}</Text>
            {hasNoShowAttendee && (
              <View className="ml-2 flex-row items-center rounded-full bg-[#FEE2E2] px-1.5 py-0.5">
                <Ionicons name="eye-off" size={10} color="#DC2626" />
                <Text className="ml-0.5 text-[10px] font-medium text-[#DC2626]">No-show</Text>
              </View>
            )}
          </View>
        ) : null}
        {/* Meeting Link */}
        {meetingInfo ? (
          <View className="mb-1 flex-row">
            <TouchableOpacity
              className="flex-row items-center"
              style={{ alignSelf: "flex-start" }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              onPress={async (e) => {
                e.stopPropagation();
                try {
                  await Linking.openURL(meetingInfo.cleanUrl);
                } catch {
                  showErrorAlert("Error", "Failed to open meeting link. Please try again.");
                }
              }}
            >
              {meetingInfo.iconUrl ? (
                <SvgImage
                  uri={meetingInfo.iconUrl}
                  width={16}
                  height={16}
                  style={{ marginRight: 6 }}
                />
              ) : (
                <Ionicons name="videocam" size={16} color="#007AFF" style={{ marginRight: 6 }} />
              )}
              <Text className="text-sm font-medium text-[#007AFF]">{meetingInfo.label}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Pressable>
      <View className="flex-row items-center justify-end gap-2">
        {isPending ? (
          <>
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-white"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: isConfirming || isDeclining ? 0.5 : 1,
              }}
              disabled={isConfirming || isDeclining}
              onPress={(e) => {
                e.stopPropagation();
                onConfirm(booking);
              }}
            >
              <Ionicons name="checkmark" size={16} color="#3C3F44" />
              <Text className="ml-1 text-sm font-medium text-[#3C3F44]">Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-white"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: isConfirming || isDeclining ? 0.5 : 1,
              }}
              disabled={isConfirming || isDeclining}
              onPress={(e) => {
                e.stopPropagation();
                onReject(booking);
              }}
            >
              <Ionicons name="close" size={16} color="#3C3F44" />
              <Text className="ml-1 text-sm font-medium text-[#3C3F44]">Reject</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* iOS Context Menu */}
        <Host matchContents>
          <ContextMenu
            modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"), padding()]}
            activationMethod="singlePress"
          >
            <ContextMenu.Items>
              {contextMenuActions.map((action) => (
                <Button
                  key={action.label}
                  systemImage={action.icon as any}
                  onPress={action.onPress}
                  role={action.role}
                  label={action.label}
                />
              ))}
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <HStack>
                <Image
                  systemName="ellipsis"
                  color="primary"
                  size={24}
                  modifiers={[frame({ height: 24, width: 17 })]}
                />
              </HStack>
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      </View>
    </View>
  );
};
