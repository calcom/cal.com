import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import React from "react";
import { Pressable, useColorScheme, View } from "react-native";
import type { SFSymbols7_0 } from "sf-symbols-typescript";
import { getBookingActions } from "@/utils/booking-actions";
import {
  BadgesRow,
  BookingDescription,
  BookingTitle,
  ConfirmRejectButtons,
  HostAndAttendees,
  MeetingLink,
  TimeAndDateRow,
} from "./BookingListItemParts";
import type { BookingListItemProps } from "./types";
import { useBookingListItemData } from "./useBookingListItemData";

export const BookingListItem: React.FC<BookingListItemProps> = ({
  booking,
  userEmail,
  isConfirming,
  isDeclining,
  onPress,
  onConfirm,
  onReject,
  onReschedule,
  onEditLocation,
  onAddGuests,
  onViewRecordings,
  onMeetingSessionDetails,
  onMarkNoShow,
  onReportBooking,
  onCancelBooking,
}) => {
  const {
    isUpcoming,
    isPending,
    isCancelled,
    isRejected,
    hostAndAttendeesDisplay,
    meetingInfo,
    hasNoShowAttendee,
    formattedDate,
    formattedTimeRange,
  } = useBookingListItemData(booking, userEmail);

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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Define context menu actions based on booking state
  type ContextMenuAction = {
    label: string;
    icon: SFSymbols7_0;
    onPress: () => void;
    role: "default" | "destructive";
  };

  const allActions: (ContextMenuAction & { visible: boolean })[] = [
    // Edit Event Section
    {
      label: "Reschedule Booking",
      icon: "calendar" as const,
      onPress: () => onReschedule?.(booking),
      role: "default" as const,
      visible: isUpcoming && !isCancelled && !isPending && !!onReschedule,
    },
    {
      label: "Edit Location",
      icon: "location" as const,
      onPress: () => onEditLocation?.(booking),
      role: "default" as const,
      visible: isUpcoming && !isCancelled && !isPending && !!onEditLocation,
    },
    {
      label: "Add Guests",
      icon: "person.badge.plus" as const,
      onPress: () => onAddGuests?.(booking),
      role: "default" as const,
      visible: isUpcoming && !isCancelled && !isPending && !!onAddGuests,
    },
    // After Event Section
    {
      label: "View Recordings",
      icon: "video" as const,
      onPress: () => onViewRecordings?.(booking),
      role: "default" as const,
      visible:
        actions.viewRecordings.visible && actions.viewRecordings.enabled && !!onViewRecordings,
    },
    {
      label: "Meeting Session Details",
      icon: "info.circle" as const,
      onPress: () => onMeetingSessionDetails?.(booking),
      role: "default" as const,
      visible:
        actions.meetingSessionDetails.visible &&
        actions.meetingSessionDetails.enabled &&
        !!onMeetingSessionDetails,
    },
    {
      label: "Mark as No-Show",
      icon: "eye.slash" as const,
      onPress: () => onMarkNoShow?.(booking),
      role: "default" as const,
      visible: actions.markNoShow.visible && actions.markNoShow.enabled && !!onMarkNoShow,
    },
    // Other Actions
    {
      label: "Report Booking",
      icon: "flag" as const,
      onPress: () => onReportBooking?.(booking),
      role: "destructive" as const,
      visible: !!onReportBooking,
    },
    {
      label: "Cancel Event",
      icon: "xmark.circle" as const,
      onPress: () => onCancelBooking?.(booking),
      role: "destructive" as const,
      visible: isUpcoming && !isCancelled && !!onCancelBooking,
    },
  ];

  const contextMenuActions: ContextMenuAction[] = allActions
    .filter((action) => action.visible)
    .map(({ label, icon, onPress, role }) => ({ label, icon, onPress, role }));

  return (
    <View
      style={{
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "#4D4D4D" : "#E5E5EA",
      }}
    >
      {/* Native iOS Context Menu for long-press */}
      <Host matchContents>
        <ContextMenu
          modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
          activationMethod="longPress"
        >
          <ContextMenu.Items>
            {contextMenuActions.map((action) => (
              <Button
                key={action.label}
                systemImage={action.icon}
                onPress={action.onPress}
                role={action.role}
                label={action.label}
              />
            ))}
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <Pressable
              onPress={() => onPress(booking)}
              style={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 12,
              }}
              className="active:bg-cal-bg-secondary dark:active:bg-[#171717]"
            >
              <TimeAndDateRow
                formattedDate={formattedDate}
                formattedTimeRange={formattedTimeRange}
              />
              <BadgesRow isPending={isPending} />
              <BookingTitle
                title={booking.title}
                isCancelled={isCancelled}
                isRejected={isRejected}
              />
              <BookingDescription description={booking.description} />
              <HostAndAttendees
                hostAndAttendeesDisplay={hostAndAttendeesDisplay}
                hasNoShowAttendee={hasNoShowAttendee}
              />
              <MeetingLink meetingInfo={meetingInfo} />
            </Pressable>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
      <View
        className="flex-row items-center justify-end"
        style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
      >
        <ConfirmRejectButtons
          booking={booking}
          isPending={isPending}
          isConfirming={isConfirming}
          isDeclining={isDeclining}
          onConfirm={onConfirm}
          onReject={onReject}
        />

        {/* iOS Context Menu */}
        <Host matchContents>
          <ContextMenu
            modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
            activationMethod="singlePress"
          >
            <ContextMenu.Items>
              {contextMenuActions.map((action) => (
                <Button
                  key={action.label}
                  systemImage={action.icon}
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
