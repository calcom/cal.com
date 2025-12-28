/**
 * ViewRecordingsScreen Component
 *
 * Screen content for viewing recordings of a Cal Video booking.
 * Used with the view-recordings route that has native Stack.Header.
 */

import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BookingRecording } from "../../services/types/bookings.types";

export interface ViewRecordingsScreenProps {
  recordings: BookingRecording[];
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

export function ViewRecordingsScreen({ recordings }: ViewRecordingsScreenProps) {
  const insets = useSafeAreaInsets();

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
      className="mb-3 overflow-hidden rounded-xl bg-white"
      onPress={() => handleOpenRecording(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center p-4">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#E8E8ED]">
          <Ionicons name="videocam" size={20} color="#6B7280" />
        </View>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-[#000]">Recording</Text>
          <Text className="mt-0.5 text-[15px] text-gray-500">{formatDate(item.startTime)}</Text>
          {item.duration && (
            <Text className="mt-0.5 text-[13px] text-gray-400">
              Duration: {formatDuration(item.duration)}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  if (recordings.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F2F7] px-8">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#E8E8ED]">
          <Ionicons name="videocam-off" size={32} color="#8E8E93" />
        </View>
        <Text className="text-center text-[17px] font-semibold text-[#000]">
          No recordings available
        </Text>
        <Text className="mt-2 text-center text-[15px] leading-5 text-gray-500">
          Recordings may take some time to process after the meeting ends.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <View className="flex-1 p-4" style={{ paddingBottom: insets.bottom }}>
        <FlatList
          data={recordings}
          renderItem={renderRecording}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      </View>
    </View>
  );
}

// Default export for React Native compatibility
export default ViewRecordingsScreen;
