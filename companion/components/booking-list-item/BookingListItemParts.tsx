import { Ionicons } from "@expo/vector-icons";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { SvgImage } from "@/components/SvgImage";
import type { Booking } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";
import type { BookingListItemData } from "./useBookingListItemData";

interface TimeAndDateRowProps {
  formattedDate: string;
  formattedTimeRange: string;
}

export function TimeAndDateRow({ formattedDate, formattedTimeRange }: TimeAndDateRowProps) {
  return (
    <View className="mb-2 flex-row flex-wrap items-center">
      <Text className="text-sm font-medium text-cal-text">{formattedDate}</Text>
      <Text className="ml-2 text-sm text-cal-text-secondary">{formattedTimeRange}</Text>
    </View>
  );
}

interface BadgesRowProps {
  isPending: boolean;
}

export function BadgesRow({ isPending }: BadgesRowProps) {
  return (
    <View className="mb-3 flex-row flex-wrap items-center">
      {isPending ? (
        <View className="mb-1 mr-2 rounded bg-cal-accent-warning px-2 py-0.5">
          <Text className="text-xs font-medium text-white">Unconfirmed</Text>
        </View>
      ) : null}
    </View>
  );
}

interface BookingTitleProps {
  title: string;
  isCancelled: boolean;
  isRejected: boolean;
}

export function BookingTitle({ title, isCancelled, isRejected }: BookingTitleProps) {
  return (
    <Text
      className={`mb-2 text-lg font-medium leading-5 text-cal-text ${isCancelled || isRejected ? "line-through" : ""}`}
      numberOfLines={2}
    >
      {title}
    </Text>
  );
}

interface BookingDescriptionProps {
  description?: string | null;
}

export function BookingDescription({ description }: BookingDescriptionProps) {
  if (!description) return null;
  return (
    <Text className="mb-2 text-sm leading-5 text-cal-text-secondary" numberOfLines={1}>
      "{description}"
    </Text>
  );
}

interface HostAndAttendeesProps {
  hostAndAttendeesDisplay: string | null;
  hasNoShowAttendee: boolean;
}

export function HostAndAttendees({
  hostAndAttendeesDisplay,
  hasNoShowAttendee,
}: HostAndAttendeesProps) {
  if (!hostAndAttendeesDisplay) return null;
  return (
    <View className="mb-2 flex-row items-center">
      <Text className="text-sm text-cal-text">{hostAndAttendeesDisplay}</Text>
      {hasNoShowAttendee && (
        <View className="ml-2 flex-row items-center rounded-full bg-[#FEE2E2] px-1.5 py-0.5">
          <Ionicons name="eye-off" size={10} color="#800020" />
          <Text className="ml-0.5 text-[10px] font-medium text-cal-accent-destructive">
            No-show
          </Text>
        </View>
      )}
    </View>
  );
}

interface MeetingLinkProps {
  meetingInfo: BookingListItemData["meetingInfo"];
}

export function MeetingLink({ meetingInfo }: MeetingLinkProps) {
  if (!meetingInfo) return null;
  return (
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
          <SvgImage uri={meetingInfo.iconUrl} width={16} height={16} style={{ marginRight: 6 }} />
        ) : (
          <Ionicons name="videocam" size={16} color="#007AFF" style={{ marginRight: 6 }} />
        )}
        <Text className="text-sm font-medium text-cal-accent">{meetingInfo.label}</Text>
      </TouchableOpacity>
    </View>
  );
}

interface ConfirmRejectButtonsProps {
  booking: Booking;
  isPending: boolean;
  isConfirming: boolean;
  isDeclining: boolean;
  onConfirm: (booking: Booking) => void;
  onReject: (booking: Booking) => void;
}

export function ConfirmRejectButtons({
  booking,
  isPending,
  isConfirming,
  isDeclining,
  onConfirm,
  onReject,
}: ConfirmRejectButtonsProps) {
  if (!isPending) return null;
  return (
    <>
      <TouchableOpacity
        className="flex-row items-center justify-center rounded-lg border border-cal-border bg-cal-bg"
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
        <Text className="ml-1 text-sm font-medium text-cal-text-emphasis">Confirm</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="flex-row items-center justify-center rounded-lg border border-cal-border bg-cal-bg"
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
        <Text className="ml-1 text-sm font-medium text-cal-text-emphasis">Reject</Text>
      </TouchableOpacity>
    </>
  );
}
