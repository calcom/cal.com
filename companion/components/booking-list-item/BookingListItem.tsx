import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { showErrorAlert } from "../../utils/alerts";
import { formatDate, formatTime, getHostAndAttendeesDisplay } from "../../utils/bookings-utils";
import { getMeetingInfo } from "../../utils/meetings-utils";
import { SvgImage } from "../SvgImage";
import type { BookingListItemProps } from "./types";

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
  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";
  const isUpcoming = new Date(endTime) >= new Date();
  const isPending = booking.status?.toUpperCase() === "PENDING";
  const isCancelled = booking.status?.toUpperCase() === "CANCELLED";
  const isRejected = booking.status?.toUpperCase() === "REJECTED";

  const hostAndAttendeesDisplay = getHostAndAttendeesDisplay(booking, userEmail);
  const meetingInfo = getMeetingInfo(booking.location);

  // Check if any attendee is marked as no-show
  const hasNoShowAttendee = booking.attendees?.some(
    (att: { noShow?: boolean; absent?: boolean }) => att.noShow === true || att.absent === true
  );

  return (
    <View className="border-b border-[#E5E5EA] bg-white">
      <TouchableOpacity
        className="active:bg-[#F8F9FA]"
        onPress={() => onPress(booking)}
        onLongPress={() => onLongPress(booking)}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
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
            "{booking.description}"
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
      </TouchableOpacity>
      <View
        className="flex-row items-center justify-end"
        style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
      >
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
        <TouchableOpacity
          className="items-center justify-center rounded-lg border border-[#E5E5EA]"
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
