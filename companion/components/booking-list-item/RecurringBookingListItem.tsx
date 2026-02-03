import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Text as UIText } from "@/components/ui/text";
import { getColors } from "@/constants/colors";
import type { Booking } from "@/services/calcom";
import type { RecurringBookingGroup } from "@/utils/bookings-utils";
import { formatDate, formatTime, getHostAndAttendeesDisplay } from "@/utils/bookings-utils";
import { getMeetingInfo } from "@/utils/meetings-utils";
import { SvgImage } from "@/components/SvgImage";
import { showErrorAlert } from "@/utils/alerts";
import { Linking } from "react-native";
import { getBookingActions } from "@/utils/booking-actions";

export interface RecurringBookingListItemProps {
  group: RecurringBookingGroup;
  userEmail?: string;
  isConfirmingAll?: boolean;
  isDecliningAll?: boolean;
  isCancellingAll?: boolean;
  onPress: (group: RecurringBookingGroup) => void;
  onConfirmAll?: (group: RecurringBookingGroup) => void;
  onRejectAll?: (group: RecurringBookingGroup) => void;
  onCancelAllRemaining?: (group: RecurringBookingGroup) => void;
  onReschedule?: (booking: Booking) => void;
  onEditLocation?: (booking: Booking) => void;
  onAddGuests?: (booking: Booking) => void;
  onViewRecordings?: (booking: Booking) => void;
  onMeetingSessionDetails?: (booking: Booking) => void;
  onMarkNoShow?: (booking: Booking) => void;
  onReportBooking?: (booking: Booking) => void;
  onCancelBooking?: (booking: Booking) => void;
}

export const RecurringBookingListItem: React.FC<RecurringBookingListItemProps> = ({
  group,
  userEmail,
  isConfirmingAll = false,
  isDecliningAll = false,
  isCancellingAll = false,
  onPress,
  onConfirmAll,
  onRejectAll,
  onCancelAllRemaining,
  onReschedule,
  onEditLocation,
  onAddGuests,
  onViewRecordings,
  onMeetingSessionDetails,
  onMarkNoShow,
  onReportBooking,
  onCancelBooking,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const colors = {
    icon: isDark ? "#FFFFFF" : "#3C3F44",
    iconDestructive: theme.destructive,
    iconDefault: isDark ? "#E5E5EA" : "#374151",
  };

  const booking = group.firstUpcoming;
  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";
  const isUpcoming = new Date(endTime) >= new Date();
  const isCancelled = booking.status?.toLowerCase() === "cancelled";
  const isRejected = booking.status?.toLowerCase() === "rejected";
  const isPending = booking.status?.toLowerCase() === "pending" || booking.requiresConfirmation;

  const hostAndAttendeesDisplay = getHostAndAttendeesDisplay(booking, userEmail);
  const meetingInfo = getMeetingInfo(booking.location);
  const formattedDate = formatDate(startTime, isUpcoming);
  const formattedTimeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;

  const isProcessing = isConfirmingAll || isDecliningAll || isCancellingAll;

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
      visible: isUpcoming && !isCancelled && !isPending && !!onReschedule,
    },
    {
      label: "Edit Location",
      icon: "location-outline",
      onPress: () => onEditLocation?.(booking),
      variant: "default" as const,
      visible: isUpcoming && !isCancelled && !isPending && !!onEditLocation,
    },
    {
      label: "Add Guests",
      icon: "person-add-outline",
      onPress: () => onAddGuests?.(booking),
      variant: "default" as const,
      visible: isUpcoming && !isCancelled && !isPending && !!onAddGuests,
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
      visible: isUpcoming && !isCancelled && !!onCancelBooking,
    },
  ];

  const visibleActions = allActions.filter((action) => action.visible);

  const destructiveStartIndex = visibleActions.findIndex(
    (action) => action.variant === "destructive"
  );

  return (
    <View
      style={{
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "#4D4D4D" : "#E5E5EA",
      }}
    >
      <Pressable
        onPress={() => onPress(group)}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
        className="active:bg-cal-bg-secondary dark:active:bg-[#171717]"
        android_ripple={{ color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }}
      >
        {/* Date and Time */}
        <View className="mb-2 flex-row flex-wrap items-center">
          <Text className="text-sm font-medium text-cal-text dark:text-white">{formattedDate}</Text>
          <Text className="ml-2 text-sm text-cal-text-secondary dark:text-[#A3A3A3]">
            {formattedTimeRange}
          </Text>
        </View>

        {/* Badges Row */}
        <View className="mb-3 flex-row flex-wrap items-center gap-2">
          {/* Recurring Badge */}
          <View className="rounded border border-cal-border bg-gray-500 px-2 py-0.5">
            <Text className="text-xs font-medium text-white">
              {group.remainingCount} {group.remainingCount === 1 ? "event" : "events"} remaining
            </Text>
          </View>

          {/* Unconfirmed Badge */}
          {group.hasUnconfirmed && (
            <View className="rounded bg-cal-accent-warning px-2 py-0.5">
              <Text className="text-xs font-medium text-white">Unconfirmed</Text>
            </View>
          )}
        </View>

        {/* Recurrence Pattern Text (for unconfirmed recurring) */}
        {group.hasUnconfirmed && group.recurrenceText && (
          <Text className="mb-2 text-sm text-cal-text-secondary dark:text-[#A3A3A3]">
            {group.recurrenceText}
          </Text>
        )}

        {/* Title */}
        <Text
          className={`mb-2 text-lg font-medium leading-5 text-cal-text dark:text-white ${isCancelled || isRejected ? "line-through" : ""}`}
          numberOfLines={2}
        >
          {booking.title}
        </Text>

        {/* Description */}
        {booking.description ? (
          <Text
            className="mb-2 text-sm leading-5 text-cal-text-secondary dark:text-[#A3A3A3]"
            numberOfLines={1}
          >
            "{booking.description}"
          </Text>
        ) : null}

        {/* Host and Attendees */}
        {hostAndAttendeesDisplay ? (
          <View className="mb-2 flex-row items-center">
            <Text className="text-sm text-cal-text dark:text-white">{hostAndAttendeesDisplay}</Text>
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
              <Text className="text-sm font-medium text-cal-accent">{meetingInfo.label}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Pressable>

      {/* Action Buttons */}
      <View
        className="flex-row flex-wrap items-center justify-end"
        style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
      >
        {/* Confirm All / Reject All for unconfirmed recurring */}
        {group.hasUnconfirmed && onRejectAll && (
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-lg border border-cal-border bg-white dark:border-cal-border-dark dark:bg-[#171717]"
            style={{
              paddingHorizontal: 12,
              height: 32,
              opacity: isProcessing ? 0.5 : 1,
            }}
            disabled={isProcessing}
            onPress={(e) => {
              e.stopPropagation();
              onRejectAll(group);
            }}
          >
            <Ionicons name="close" size={16} color={isDark ? "#FFFFFF" : "#3C3F44"} />
            <Text className="ml-1 text-sm font-medium text-cal-text-emphasis dark:text-white">
              Reject all
            </Text>
          </TouchableOpacity>
        )}

        {group.hasUnconfirmed && onConfirmAll && (
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-lg bg-black dark:bg-white"
            style={{
              paddingHorizontal: 12,
              height: 32,
              opacity: isProcessing ? 0.5 : 1,
            }}
            disabled={isProcessing}
            onPress={(e) => {
              e.stopPropagation();
              onConfirmAll(group);
            }}
          >
            <Ionicons name="checkmark" size={16} color={isDark ? "#000000" : "#FFFFFF"} />
            <Text className="ml-1 text-sm font-medium text-white dark:text-black">Confirm all</Text>
          </TouchableOpacity>
        )}

        {/* Cancel All Remaining */}
        {onCancelAllRemaining && group.remainingCount > 0 && !group.hasUnconfirmed && (
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-lg border bg-white dark:bg-[#171717]"
            style={{
              paddingHorizontal: 12,
              height: 32,
              opacity: isProcessing ? 0.5 : 1,
              borderColor: theme.destructive,
            }}
            disabled={isProcessing}
            onPress={(e) => {
              e.stopPropagation();
              onCancelAllRemaining(group);
            }}
          >
            <Ionicons name="close-circle-outline" size={16} color={theme.destructive} />
            <Text className="ml-1 text-sm font-medium" style={{ color: theme.destructive }}>
              Cancel all remaining
            </Text>
          </TouchableOpacity>
        )}

        {/* Dropdown Menu - only show when there are visible actions */}
        {visibleActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable
                className="items-center justify-center rounded-lg border border-cal-border dark:border-cal-border-dark"
                style={{ width: 32, height: 32 }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.icon} />
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
                      color={
                        action.variant === "destructive"
                          ? colors.iconDestructive
                          : colors.iconDefault
                      }
                      style={{ marginRight: 8 }}
                    />
                    <UIText
                      style={{
                        color:
                          action.variant === "destructive"
                            ? colors.iconDestructive
                            : isDark
                              ? "#FFFFFF"
                              : "#374151",
                      }}
                    >
                      {action.label}
                    </UIText>
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
