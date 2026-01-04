/**
 * MeetingSessionDetailsScreen Component
 *
 * Screen content for viewing meeting session details of a Cal Video booking.
 * Used with the meeting-session-details route that has native Stack.Header.
 */

import { Ionicons } from "@expo/vector-icons";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ConferencingSession } from "@/services/types/bookings.types";

export interface MeetingSessionDetailsScreenProps {
  sessions: ConferencingSession[];
  transparentBackground?: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
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

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MeetingSessionDetailsScreen({
  sessions,
  transparentBackground = false,
}: MeetingSessionDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const backgroundStyle = transparentBackground ? "bg-transparent" : "bg-[#F2F2F7]";
  const pillStyle = transparentBackground ? "bg-[#E8E8ED]/50" : "bg-[#E8E8ED]";

  const renderSession = ({ item, index }: { item: ConferencingSession; index: number }) => (
    <View
      className={`mb-4 overflow-hidden rounded-xl ${
        transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
      }`}
    >
      {/* Session header */}
      <View
        className={`flex-row items-center justify-between p-4 ${
          transparentBackground ? "" : "border-b border-gray-100"
        }`}
      >
        <View className="flex-row items-center">
          <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${pillStyle}`}>
            <Ionicons name="videocam" size={20} color="#6B7280" />
          </View>
          <Text className="text-[17px] font-semibold text-[#000]">
            Session {sessions.length > 1 ? index + 1 : ""}
          </Text>
        </View>
        {item.duration && (
          <View className={`rounded-full px-3 py-1 ${pillStyle}`}>
            <Text className="text-[13px] font-medium text-gray-600">
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}
      </View>

      {/* Session details */}
      <View className="p-4">
        <View className="mb-2 flex-row items-center">
          <Ionicons name="time-outline" size={18} color="#8E8E93" />
          <Text className="ml-2 text-[15px] text-gray-600">
            Started: {formatDate(item.startTime)}
          </Text>
        </View>
        {item.endTime && (
          <View className="mb-2 flex-row items-center">
            <Ionicons name="time-outline" size={18} color="#8E8E93" />
            <Text className="ml-2 text-[15px] text-gray-600">
              Ended: {formatTime(item.endTime)}
            </Text>
          </View>
        )}
        {item.maxParticipants && (
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={18} color="#8E8E93" />
            <Text className="ml-2 text-[15px] text-gray-600">
              Max participants: {item.maxParticipants}
            </Text>
          </View>
        )}
      </View>

      {/* Participants */}
      {item.participants && item.participants.length > 0 && (
        <View className={`p-4 ${transparentBackground ? "" : "border-t border-gray-100"}`}>
          <Text className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500">
            Participants ({item.participants.length})
          </Text>
          {item.participants.map((participant, pIndex) => (
            <View
              key={participant.id || pIndex}
              className={`mb-2 flex-row items-center p-3 ${
                transparentBackground ? "" : "rounded-xl bg-[#F2F2F7]"
              }`}
            >
              <View
                className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${pillStyle}`}
              >
                <Ionicons name="person" size={18} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-[#000]">
                  {participant.userName || "Unknown participant"}
                </Text>
                <Text className="mt-0.5 text-[13px] text-gray-500">
                  Joined: {formatTime(participant.joinTime)}
                  {participant.duration && ` • ${formatDuration(participant.duration)}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (sessions.length === 0) {
    return (
      <View className={`flex-1 items-center justify-center px-8 ${backgroundStyle}`}>
        <View className={`mb-4 h-16 w-16 items-center justify-center rounded-full ${pillStyle}`}>
          <Ionicons name="information-circle" size={32} color="#8E8E93" />
        </View>
        <Text className="text-center text-[17px] font-semibold text-[#000]">
          No session details available
        </Text>
        <Text className="mt-2 text-center text-[15px] leading-5 text-gray-500">
          Session details may not be available for all meetings.
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${backgroundStyle}`}>
      <View className="flex-1 p-4" style={{ paddingBottom: insets.bottom }}>
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={!transparentBackground}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      </View>
    </View>
  );
}

// Default export for React Native compatibility
export default MeetingSessionDetailsScreen;
