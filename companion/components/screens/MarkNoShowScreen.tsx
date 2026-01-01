/**
 * MarkNoShowScreen Component
 *
 * Screen content for marking attendees as no-show for a booking.
 * Used with the mark-no-show route that has native Stack.Header.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Booking } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";

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
  "use no memo";
  const insets = useSafeAreaInsets();
  const backgroundStyle = transparentBackground ? "bg-transparent" : "bg-[#F2F2F7]";
  const pillStyle = transparentBackground ? "bg-[#E8E8ED]/50" : "bg-[#E8E8ED]";
  const safeAttendees = Array.isArray(attendees) ? attendees : [];
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);

  const handleMarkNoShow = async (attendee: Attendee) => {
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
          onPress: async () => {
            setProcessingEmail(attendee.email);
            try {
              const updatedBooking = await CalComAPIService.markAbsent(
                booking.uid,
                attendee.email,
                !isCurrentlyNoShow
              );

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

              Alert.alert(
                "Success",
                `${attendee.name || attendee.email} has been ${
                  isCurrentlyNoShow ? "unmarked as no-show" : "marked as no-show"
                }`
              );
              setProcessingEmail(null);
            } catch (error) {
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
              Alert.alert("Error", error instanceof Error ? error.message : `Failed to ${action}`);
              setProcessingEmail(null);
            }
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
    const itemBgStyle = transparentBackground ? "bg-white/60" : isNoShow ? "bg-[#FEF2F2]" : "bg-white";

    return (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-4 ${
          transparentBackground
            ? `rounded-xl border border-gray-300/40 ${!isLast ? "mb-3" : ""}`
            : !isLast
              ? "border-b border-gray-100"
              : ""
        } ${itemBgStyle}`}
        onPress={() => handleMarkNoShow(item)}
        disabled={isProcessing}
        activeOpacity={0.7}>
        <View
          className={`mr-3 h-12 w-12 items-center justify-center rounded-full ${
            transparentBackground ? "bg-[#000]" : isNoShow ? "bg-[#FECACA]" : pillStyle
          }`}>
          <Text
            className={`text-[16px] font-semibold ${
              transparentBackground ? "text-white" : isNoShow ? "text-[#DC2626]" : "text-gray-600"
            }`}>
            {getInitials(item.name)}
          </Text>
        </View>
        <View className="mr-3 flex-1">
          <Text className="text-[17px] font-medium text-[#000]">{item.name || "Unknown"}</Text>
          <Text className="mt-0.5 text-[15px] text-gray-500">{item.email}</Text>
          {isNoShow && (
            <View className="mt-1.5 flex-row items-center">
              <Ionicons name="eye-off" size={12} color="#DC2626" />
              <Text className="ml-1 text-[13px] font-medium text-[#DC2626]">Marked as no-show</Text>
            </View>
          )}
        </View>
        {isProcessing ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <View className="flex-row items-center">
            <View
              className={`flex-row items-center rounded-full px-3.5 py-2 ${
                isNoShow ? "border border-[#16A34A] bg-white" : "border border-[#FEE2E2] bg-[#FEE2E2]"
              }`}>
              <Ionicons
                name={isNoShow ? "eye" : "eye-off"}
                size={15}
                color={isNoShow ? "#16A34A" : "#DC2626"}
                style={{ marginRight: 5 }}
              />
              <Text className={`text-[14px] font-semibold ${isNoShow ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
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
      <View className={`flex-1 items-center justify-center ${backgroundStyle}`}>
        <Text className="text-gray-500">No booking data</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${backgroundStyle}`}>
      <View className="flex-1 p-4">
        {safeAttendees.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-[#E8E8ED]">
              <Ionicons name="people" size={40} color="#9CA3AF" />
            </View>
            <Text className="text-[17px] font-medium text-gray-700">No attendees found</Text>
            <Text className="mt-2 max-w-[280px] text-center text-[15px] text-gray-500">
              Attendee information is not available for this booking.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-gray-500">
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
              <View className="overflow-hidden rounded-xl bg-white">
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
