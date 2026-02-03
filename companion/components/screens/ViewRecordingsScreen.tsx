/**
 * ViewRecordingsScreen Component
 *
 * Screen content for viewing recordings of a Cal Video booking.
 * Used with the view-recordings route that has native Stack.Header.
 */

import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { FlatList, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BookingRecording } from "@/services/types/bookings.types";
import { getColors } from "@/constants/colors";

export interface ViewRecordingsScreenProps {
  recordings: BookingRecording[];
  transparentBackground?: boolean;
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

export function ViewRecordingsScreen({
  recordings,
  transparentBackground = false,
}: ViewRecordingsScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);
  const backgroundStyle = transparentBackground
    ? "bg-transparent"
    : isDark
      ? "bg-black"
      : `bg-[${theme.backgroundMuted}]`;
  const pillStyle = transparentBackground
    ? "bg-[#E8E8ED]/50"
    : isDark
      ? "bg-[#4D4D4D]"
      : "bg-[#E8E8ED]";

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
      className={`mb-3 overflow-hidden rounded-xl ${
        transparentBackground
          ? isDark
            ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
            : "border border-gray-300/40 bg-white/60"
          : isDark
            ? "bg-[#171717]"
            : "bg-white"
      }`}
      onPress={() => handleOpenRecording(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center p-4">
        <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${pillStyle}`}>
          <Ionicons name="videocam" size={20} color={isDark ? "#A3A3A3" : "#6B7280"} />
        </View>
        <View className="flex-1">
          <Text className={`text-[17px] font-medium ${isDark ? "text-white" : "text-[#000]"}`}>
            Recording
          </Text>
          <Text className={`mt-0.5 text-[15px] ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}>
            {formatDate(item.startTime)}
          </Text>
          {item.duration && (
            <Text className={`mt-0.5 text-[13px] ${isDark ? "text-[#636366]" : "text-gray-400"}`}>
              Duration: {formatDuration(item.duration)}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? "#48484A" : "#C7C7CC"} />
      </View>
    </TouchableOpacity>
  );

  if (recordings.length === 0) {
    return (
      <View className={`flex-1 items-center justify-center px-8 ${backgroundStyle}`}>
        <View className={`mb-4 h-16 w-16 items-center justify-center rounded-full ${pillStyle}`}>
          <Ionicons name="videocam-off" size={32} color="#A3A3A3" />
        </View>
        <Text
          className={`text-center text-[17px] font-semibold ${isDark ? "text-white" : "text-[#000]"}`}
        >
          No recordings available
        </Text>
        <Text
          className={`mt-2 text-center text-[15px] leading-5 ${isDark ? "text-[#A3A3A3]" : "text-gray-500"}`}
        >
          Recordings may take some time to process after the meeting ends.
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${backgroundStyle}`}>
      <View className="flex-1 p-4" style={{ paddingBottom: insets.bottom }}>
        <FlatList
          data={recordings}
          renderItem={renderRecording}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={!transparentBackground}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      </View>
    </View>
  );
}

// Default export for React Native compatibility
export default ViewRecordingsScreen;
