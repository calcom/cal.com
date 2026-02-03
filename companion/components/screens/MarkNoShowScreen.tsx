/**
 * MarkNoShowScreen Component
 *
 * Screen content for marking attendees as no-show for a booking.
 * Used with the mark-no-show route that has native Stack.Header.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMarkNoShow } from "@/hooks/useBookings";
import type { Booking } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { getColors } from "@/constants/colors";

interface Attendee {
  id?: number | string;
  email: string;
  name: string;
  noShow?: boolean;
}

export interface MarkNoShowScreenProps {
  booking: Booking | null;
  attendees: Attendee[];
  onUpdate: (attendees: Attendee[]) => void;
  onBookingUpdate?: (booking: Booking) => void;
  transparentBackground?: boolean;
}

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return "***";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.substring(0, 2)}***@${domain}`;
};

export function MarkNoShowScreen({
  booking,
  attendees,
  onUpdate,
  onBookingUpdate,
  transparentBackground = false,
}: MarkNoShowScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);
  const backgroundColor = transparentBackground
    ? "transparent"
    : isDark
      ? theme.background
      : theme.backgroundMuted;
  const pillStyle = transparentBackground
    ? "bg-[#E8E8ED]/50"
    : isDark
      ? "bg-[#4D4D4D]"
      : "bg-[#E8E8ED]";
  const safeAttendees = Array.isArray(attendees) ? attendees : [];
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);

  // Dark mode colors
  const destructiveColor = theme.destructive;
  const successColor = "#16A34A";

  // Mark no-show mutation
  const markNoShowMutation = useMarkNoShow();

  const handleMarkNoShow = (attendee: Attendee) => {
    if (!booking) return;

    const isCurrentlyNoShow = attendee.noShow === true;
    const action = isCurrentlyNoShow ? "unmark no-show" : "mark no-show";

    Alert.alert(
      isCurrentlyNoShow ? "Unmark No-Show" : "Mark No-Show",
      `Are you sure you want to ${action} ${attendee.name || attendee.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: isCurrentlyNoShow ? "default" : "destructive",
          onPress: () => {
            setProcessingEmail(attendee.email);
            markNoShowMutation.mutate(
              {
                uid: booking.uid,
                attendeeEmail: attendee.email,
                absent: !isCurrentlyNoShow,
              },
              {
                onSuccess: (updatedBooking) => {
                  // API returns "absent" field, not "noShow"
                  const updatedAttendees: Attendee[] = [];
                  if (updatedBooking.attendees && Array.isArray(updatedBooking.attendees)) {
                    updatedBooking.attendees.forEach(
                      (att: {
                        id?: number | string;
                        email: string;
                        name?: string;
                        noShow?: boolean;
                        absent?: boolean;
                      }) => {
                        updatedAttendees.push({
                          id: att.id,
                          email: att.email,
                          name: att.name || att.email,
                          noShow: att.absent === true || att.noShow === true,
                        });
                      }
                    );
                  }

                  onUpdate(updatedAttendees);

                  if (onBookingUpdate) {
                    onBookingUpdate(updatedBooking);
                  }

                  showSuccessAlert(
                    "Success",
                    `${attendee.name || attendee.email} has been ${
                      isCurrentlyNoShow ? "unmarked as no-show" : "marked as no-show"
                    }`
                  );
                  setProcessingEmail(null);
                },
                onError: (error) => {
                  console.error("[MarkNoShowScreen] Failed to mark no-show:", error);
                  if (__DEV__) {
                    const message = error instanceof Error ? error.message : String(error);
                    const stack = error instanceof Error ? error.stack : undefined;
                    console.debug("[MarkNoShowScreen] Error details:", {
                      message,
                      stack,
                      attendeeEmail: maskEmail(attendee.email),
                      bookingUid: booking.uid,
                      absent: !isCurrentlyNoShow,
                    });
                  }
                  showErrorAlert(
                    "Error",
                    error instanceof Error ? error.message : `Failed to ${action}`
                  );
                  setProcessingEmail(null);
                },
              }
            );
          },
        },
      ]
    );
  };

  const renderAttendee = ({ item, index }: { item: Attendee; index: number }) => {
    const isNoShow = item.noShow === true;
    const isProcessing = processingEmail === item.email;
    const isLast = index === safeAttendees.length - 1;

    // For transparent mode (iOS glass UI), use consistent styling regardless of no-show state
    const itemBgStyle = transparentBackground
      ? isDark
        ? "bg-[#171717]/80"
        : "bg-white/60"
      : isNoShow
        ? isDark
          ? "bg-[#FF453A]/10"
          : "bg-[#FEF2F2]"
        : isDark
          ? "bg-[#171717]"
          : "bg-white";

    return (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-4 ${
          transparentBackground
            ? `rounded-xl ${isDark ? "border border-[#4D4D4D]/40" : "border border-gray-300/40"} ${!isLast ? "mb-3" : ""}`
            : !isLast
              ? isDark
                ? "border-b border-[#4D4D4D]"
                : "border-b border-gray-100"
              : ""
        } ${itemBgStyle}`}
        onPress={() => handleMarkNoShow(item)}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <View
          className={`mr-3 h-12 w-12 items-center justify-center rounded-full ${
            transparentBackground
              ? "bg-[#000]"
              : isNoShow
                ? isDark
                  ? "bg-[#FF453A]/20"
                  : "bg-[#FECACA]"
                : pillStyle
          }`}
        >
          <Text
            className={`text-[16px] font-semibold ${
              transparentBackground ? "text-white" : isDark ? "text-[#A3A3A3]" : "text-gray-600"
            }`}
            style={!transparentBackground && isNoShow ? { color: theme.destructive } : undefined}
          >
            {getInitials(item.name)}
          </Text>
        </View>
        <View className="mr-3 flex-1">
          <Text className={`text-[17px] font-medium ${isDark ? "text-white" : "text-[#000]"}`}>
            {item.name || "Unknown"}
          </Text>
          <Text className={`mt-0.5 text-[15px] ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}>
            {item.email}
          </Text>
          {isNoShow && (
            <View className="mt-1.5 flex-row items-center">
              <Ionicons name="eye-off" size={12} color={destructiveColor} />
              <Text style={{ color: destructiveColor }} className="ml-1 text-[13px] font-medium">
                Marked as no-show
              </Text>
            </View>
          )}
        </View>
        {isProcessing ? (
          <ActivityIndicator size="small" color={isDark ? "#A3A3A3" : "#6B7280"} />
        ) : (
          <View className="flex-row items-center">
            <View
              className={`flex-row items-center rounded-full px-3.5 py-2 ${
                isNoShow
                  ? isDark
                    ? "border border-[#16A34A] bg-[#171717]"
                    : "border border-[#16A34A] bg-white"
                  : isDark
                    ? "border border-[#FF453A]/30 bg-[#FF453A]/10"
                    : "border border-[#FEE2E2] bg-[#FEE2E2]"
              }`}
            >
              <Ionicons
                name={isNoShow ? "eye" : "eye-off"}
                size={15}
                color={isNoShow ? successColor : destructiveColor}
                style={{ marginRight: 5 }}
              />
              <Text
                style={{ color: isNoShow ? successColor : destructiveColor }}
                className="text-[14px] font-semibold"
              >
                {isNoShow ? "Unmark" : "Mark"}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!booking) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor }}>
        <Text className={`${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}>No booking data</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor }}>
      <View className="flex-1 p-4">
        {safeAttendees.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View
              className={`mb-4 h-20 w-20 items-center justify-center rounded-full ${pillStyle}`}
            >
              <Ionicons name="people" size={40} color={isDark ? "#A3A3A3" : "#9CA3AF"} />
            </View>
            <Text className={`text-[17px] font-medium ${isDark ? "text-white" : "text-gray-700"}`}>
              No attendees found
            </Text>
            <Text
              className={`mt-2 max-w-[280px] text-center text-[15px] ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}
            >
              Attendee information is not available for this booking.
            </Text>
          </View>
        ) : (
          <>
            <Text
              className={`mb-2 px-1 text-[13px] font-medium uppercase tracking-wide ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}
            >
              Attendees ({safeAttendees.length})
            </Text>
            {transparentBackground ? (
              <FlatList
                data={safeAttendees}
                renderItem={renderAttendee}
                keyExtractor={(item) => item.email}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            ) : (
              <View
                className={`overflow-hidden rounded-xl ${isDark ? "bg-[#171717]" : "bg-white"}`}
              >
                <FlatList
                  data={safeAttendees}
                  renderItem={renderAttendee}
                  keyExtractor={(item) => item.email}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// Default export for React Native compatibility
export default MarkNoShowScreen;
