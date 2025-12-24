/**
 * ViewRecordingsModal Component
 *
 * Modal for viewing recordings of a Cal Video booking.
 * Opens download links in an in-app browser.
 */
import type { BookingRecording } from "../../services/types/bookings.types";
import { FullScreenModal } from "../FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";

interface ViewRecordingsModalProps {
  visible: boolean;
  onClose: () => void;
  recordings: BookingRecording[];
  isLoading?: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "Unknown duration";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ViewRecordingsModal({
  visible,
  onClose,
  recordings,
  isLoading = false,
}: ViewRecordingsModalProps) {
  const handleOpenRecording = async (recording: BookingRecording) => {
    try {
      await WebBrowser.openBrowserAsync(recording.downloadUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch {
      console.error("Failed to open recording");
    }
  };

  const renderRecording = ({ item }: { item: BookingRecording }) => (
    <TouchableOpacity
      className="mb-3 rounded-lg border border-gray-200 bg-white p-4"
      onPress={() => handleOpenRecording(item)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Ionicons name="videocam" size={20} color="#6B7280" />
            <Text className="ml-2 text-base font-medium text-gray-900">Recording</Text>
          </View>
          <Text className="mt-1 text-sm text-gray-500">{formatDate(item.startTime)}</Text>
          {item.duration && (
            <Text className="mt-1 text-sm text-gray-500">
              Duration: {formatDuration(item.duration)}
            </Text>
          )}
        </View>
        <Ionicons name="open-outline" size={20} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );

  return (
    <FullScreenModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <View style={{ width: 60 }} />
          <Text className="text-lg font-semibold">Recordings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base font-medium text-black">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#000" />
              <Text className="mt-2 text-gray-500">Loading recordings...</Text>
            </View>
          ) : recordings.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="videocam-off" size={48} color="#9CA3AF" />
              <Text className="mt-2 text-base text-gray-500">No recordings available</Text>
              <Text className="mt-1 text-sm text-gray-400">
                Recordings may take some time to process after the meeting ends.
              </Text>
            </View>
          ) : (
            <FlatList
              data={recordings}
              renderItem={renderRecording}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </FullScreenModal>
  );
}
