import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";

import type { BookingListItemProps } from "./types";
import { SvgImage } from "../SvgImage";
import { getMeetingInfo } from "../../utils/meetings-utils";
import { formatTime, formatDate, getHostAndAttendeesDisplay } from "../../utils/bookings-utils";
import { showErrorAlert } from "../../utils/alerts";

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
            &quot;{booking.description}&quot;
          </Text>
        ) : null}
        {/* Host and Attendees */}
        {hostAndAttendeesDisplay ? (
          <Text className="mb-2 text-sm text-[#333]">{hostAndAttendeesDisplay}</Text>
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
