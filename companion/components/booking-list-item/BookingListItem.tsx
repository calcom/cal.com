import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Text } from "@/components/ui/text";
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

  const insets = useSafeAreaInsets();

  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  const actions = React.useMemo(() => {
    return getBookingActions({
      booking,
      eventType: undefined,
      currentUserId: undefined,
      currentUserEmail: userEmail,
      isOnline: true,
    });
  }, [booking, userEmail]);

  type DropdownAction = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: "default" | "destructive";
  };

  const allActions: (DropdownAction & { visible: boolean })[] = [
    {
      label: "Reschedule Booking",
      icon: "calendar-outline",
      onPress: () => onReschedule?.(booking),
      variant: "default" as const,
      visible: isUpcoming && !isCancelled && !isRejected && !isPending && !!onReschedule,
    },
    {
      label: "Edit Location",
      icon: "location-outline",
      onPress: () => onEditLocation?.(booking),
      variant: "default" as const,
      visible: isUpcoming && !isCancelled && !isRejected && !isPending && !!onEditLocation,
    },
    {
      label: "Add Guests",
      icon: "person-add-outline",
      onPress: () => onAddGuests?.(booking),
      variant: "default" as const,
      visible: isUpcoming && !isCancelled && !isRejected && !isPending && !!onAddGuests,
    },
    {
      label: "View Recordings",
      icon: "videocam-outline",
      onPress: () => onViewRecordings?.(booking),
      variant: "default" as const,
      visible:
        actions.viewRecordings.visible && actions.viewRecordings.enabled && !!onViewRecordings,
    },
    {
      label: "Meeting Session Details",
      icon: "information-circle-outline",
      onPress: () => onMeetingSessionDetails?.(booking),
      variant: "default" as const,
      visible:
        actions.meetingSessionDetails.visible &&
        actions.meetingSessionDetails.enabled &&
        !!onMeetingSessionDetails,
    },
    {
      label: "Mark as No-Show",
      icon: "eye-off-outline",
      onPress: () => onMarkNoShow?.(booking),
      variant: "default" as const,
      visible: actions.markNoShow.visible && actions.markNoShow.enabled && !!onMarkNoShow,
    },
    {
      label: "Report Booking",
      icon: "flag-outline",
      onPress: () => onReportBooking?.(booking),
      variant: "destructive" as const,
      visible: !!onReportBooking,
    },
    {
      label: "Cancel Event",
      icon: "close-circle-outline",
      onPress: () => onCancelBooking?.(booking),
      variant: "destructive" as const,
      visible: isUpcoming && !isCancelled && !isRejected && !!onCancelBooking,
    },
  ];

  const visibleActions = allActions.filter((action) => action.visible);

  const destructiveStartIndex = visibleActions.findIndex(
    (action) => action.variant === "destructive"
  );

  return (
    <View className="border-b border-cal-border bg-cal-bg">
      <Pressable
        onPress={() => onPress(booking)}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
        className="active:bg-cal-bg-secondary"
        android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
      >
        <TimeAndDateRow formattedDate={formattedDate} formattedTimeRange={formattedTimeRange} />
        <BadgesRow isPending={isPending} />
        <BookingTitle title={booking.title} isCancelled={isCancelled} isRejected={isRejected} />
        <BookingDescription description={booking.description} />
        <HostAndAttendees
          hostAndAttendeesDisplay={hostAndAttendeesDisplay}
          hasNoShowAttendee={hasNoShowAttendee}
        />
        <MeetingLink meetingInfo={meetingInfo} />
      </Pressable>
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

        {visibleActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable
                className="items-center justify-center rounded-lg border border-cal-border"
                style={{ width: 32, height: 32 }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
              </Pressable>
            </DropdownMenuTrigger>

            <DropdownMenuContent insets={contentInsets} sideOffset={8} className="w-52" align="end">
              {visibleActions.map((action, index) => (
                <React.Fragment key={action.label}>
                  {index === destructiveStartIndex && destructiveStartIndex > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem variant={action.variant} onPress={action.onPress}>
                    <Ionicons
                      name={action.icon}
                      size={18}
                      color={action.variant === "destructive" ? "#800020" : "#374151"}
                      style={{ marginRight: 8 }}
                    />
                    <Text className={action.variant === "destructive" ? "text-destructive" : ""}>
                      {action.label}
                    </Text>
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </View>
    </View>
  );
};
