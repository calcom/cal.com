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

export function MarkNoShowModal({
  visible,
  onClose,
  onSubmit,
  attendees,
  isLoading = false,
}: MarkNoShowModalProps) {
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

  const renderAttendee = ({ item }: { item: Attendee }) => {
    const isNoShow = item.noShow === true;
    const isProcessing = processingEmail === item.email;

    return (
      <TouchableOpacity
        className={`mb-2 flex-row items-center rounded-lg border p-3 ${
          isNoShow ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
        }`}
        onPress={() => handleMarkNoShow(item)}
        disabled={isProcessing || isLoading}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-200">
          <Ionicons name="person" size={20} color={isNoShow ? "#DC2626" : "#6B7280"} />
        </View>
        <View className="flex-1">
          <Text className={`text-base font-medium ${isNoShow ? "text-red-700" : "text-gray-900"}`}>
            {item.name || "Unknown"}
          </Text>
          <Text className={`text-sm ${isNoShow ? "text-red-500" : "text-gray-500"}`}>
            {item.email}
          </Text>
          {isNoShow && (
            <View className="mt-1 flex-row items-center">
              <Ionicons name="eye-off" size={12} color="#DC2626" />
              <Text className="ml-1 text-xs text-red-600">Marked as no-show</Text>
            </View>
          )}
        </View>
        {isProcessing ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <View className="flex-row items-center">
            <Text className={`mr-1 text-sm ${isNoShow ? "text-green-600" : "text-red-600"}`}>
              {isNoShow ? "Mark Present" : "No-Show"}
            </Text>
            <Ionicons
              name={isNoShow ? "checkmark-circle" : "eye-off"}
              size={20}
              color={isNoShow ? "#16A34A" : "#DC2626"}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FullScreenModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <View style={{ width: 60 }} />
          <Text className="text-lg font-semibold">Mark No-Show</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base font-medium text-black">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          {/* Info note */}
          <View className="mb-4 flex-row items-start rounded-lg bg-blue-50 p-3">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text className="ml-2 flex-1 text-sm text-blue-700">
              Tap an attendee to mark them as no-show or to undo a previous no-show marking.
            </Text>
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#000" />
              <Text className="mt-2 text-gray-500">Loading attendees...</Text>
            </View>
          ) : attendees.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="people" size={48} color="#9CA3AF" />
              <Text className="mt-2 text-base text-gray-500">No attendees found</Text>
              <Text className="mt-1 text-center text-sm text-gray-400">
                Attendee information is not available for this booking.
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Attendees ({attendees.length})
              </Text>
              <FlatList
                data={attendees}
                renderItem={renderAttendee}
                keyExtractor={(item) => item.email}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      </View>
    </FullScreenModal>
  );
}
