/**
 * MarkNoShowModal Component
 *
 * Modal for marking attendees as no-show for a booking.
 * Allows selecting multiple attendees and supports undo (marking as present).
 */
import { FullScreenModal } from "../FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Attendee {
  id?: number | string;
  email: string;
  name: string;
  noShow?: boolean;
}

interface MarkNoShowModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (attendeeEmail: string, absent: boolean) => Promise<void>;
  attendees: Attendee[];
  isLoading?: boolean;
}

// Get initials from a name
const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export function MarkNoShowModal({
  visible,
  onClose,
  onSubmit,
  attendees,
  isLoading = false,
}: MarkNoShowModalProps) {
  const insets = useSafeAreaInsets();
  // Normalize attendees to always be an array (defensive against undefined/null)
  const safeAttendees = Array.isArray(attendees) ? attendees : [];
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);

  // Reset state when modal opens - currently no selection state needed
  // but keeping useEffect for future multi-select functionality
  useEffect(() => {
    if (visible) {
      setProcessingEmail(null);
    }
  }, [visible]);

  const handleMarkNoShow = async (attendee: Attendee) => {
    const isCurrentlyNoShow = attendee.noShow === true;
    const action = isCurrentlyNoShow ? "mark as present" : "mark as no-show";

    Alert.alert(
      isCurrentlyNoShow ? "Mark as Present" : "Mark as No-Show",
      `Are you sure you want to ${action} ${attendee.name || attendee.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: isCurrentlyNoShow ? "default" : "destructive",
          onPress: async () => {
            try {
              setProcessingEmail(attendee.email);
              await onSubmit(attendee.email, !isCurrentlyNoShow);
              Alert.alert(
                "Success",
                `${attendee.name || attendee.email} has been ${
                  isCurrentlyNoShow ? "marked as present" : "marked as no-show"
                }`
              );
            } catch (error) {
              Alert.alert("Error", error instanceof Error ? error.message : `Failed to ${action}`);
            } finally {
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

    return (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-3 ${!isLast ? "border-b border-gray-100" : ""} ${
          isNoShow ? "bg-[#FEF2F2]" : "bg-white"
        }`}
        onPress={() => handleMarkNoShow(item)}
        disabled={isProcessing || isLoading}
        activeOpacity={0.7}
      >
        <View
          className={`mr-3 h-11 w-11 items-center justify-center rounded-full ${
            isNoShow ? "bg-[#FECACA]" : "bg-[#E8E8ED]"
          }`}
        >
          <Text
            className={`text-[15px] font-semibold ${isNoShow ? "text-[#DC2626]" : "text-gray-600"}`}
          >
            {getInitials(item.name)}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className={`text-[17px] font-medium ${isNoShow ? "text-[#991B1B]" : "text-[#000]"}`}
          >
            {item.name || "Unknown"}
          </Text>
          <Text className={`text-[15px] ${isNoShow ? "text-[#DC2626]" : "text-gray-500"}`}>
            {item.email}
          </Text>
          {isNoShow && (
            <View className="mt-1 flex-row items-center">
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
              className={`rounded-full px-3 py-1.5 ${isNoShow ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"}`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  isNoShow ? "text-[#16A34A]" : "text-[#DC2626]"
                }`}
              >
                {isNoShow ? "Mark Present" : "No-Show"}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FullScreenModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[#F2F2F7]" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <View style={{ width: 50 }} />
          <Text className="text-[17px] font-semibold text-[#000]">Mark No-Show</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-base font-semibold text-[#007AFF]">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          {/* Info note */}
          <View className="mb-4 flex-row items-start rounded-xl bg-[#E3F2FD] p-4">
            <Ionicons name="information-circle" size={20} color="#1976D2" />
            <Text className="ml-3 flex-1 text-[15px] leading-5 text-[#1565C0]">
              Tap an attendee to mark them as no-show or to undo a previous no-show marking.
            </Text>
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#007AFF" />
              <Text className="mt-3 text-[15px] text-gray-500">Loading attendees...</Text>
            </View>
          ) : safeAttendees.length === 0 ? (
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
              <View className="overflow-hidden rounded-xl">
                <FlatList
                  data={safeAttendees}
                  renderItem={renderAttendee}
                  keyExtractor={(item) => item.email}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </FullScreenModal>
  );
}
