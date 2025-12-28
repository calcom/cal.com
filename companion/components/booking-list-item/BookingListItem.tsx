import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { TouchableOpacity, View } from "react-native";
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
  onLongPress,
  onConfirm,
  onReject,
  onActionsPress,
}) => {
  const {
    isPending,
    isCancelled,
    isRejected,
    hostAndAttendeesDisplay,
    meetingInfo,
    hasNoShowAttendee,
    formattedDate,
    formattedTimeRange,
  } = useBookingListItemData(booking, userEmail);

  return (
    <View className="border-b border-cal-border bg-cal-bg">
      <TouchableOpacity
        className="active:bg-cal-bg-secondary"
        onPress={() => onPress(booking)}
        onLongPress={() => onLongPress(booking)}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
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
      </TouchableOpacity>
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
        <TouchableOpacity
          className="items-center justify-center rounded-lg border border-cal-border"
          style={{ width: 32, height: 32 }}
          onPress={(e) => {
            e.stopPropagation();
            onActionsPress(booking);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
