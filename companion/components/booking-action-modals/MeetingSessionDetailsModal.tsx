/**
 * MeetingSessionDetailsModal Component
 *
 * Modal for viewing meeting session details of a Cal Video booking.
 * Shows session information and participant details.
 */
import type { ConferencingSession } from "../../services/types/bookings.types";
import { FullScreenModal } from "../FullScreenModal";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MeetingSessionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  sessions: ConferencingSession[];
  isLoading?: boolean;
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

export function MeetingSessionDetailsModal({
  visible,
  onClose,
  sessions,
  isLoading = false,
}: MeetingSessionDetailsModalProps) {
  const insets = useSafeAreaInsets();

  const renderSession = ({ item, index }: { item: ConferencingSession; index: number }) => (
    <View className="mb-4 overflow-hidden rounded-xl bg-white">
      {/* Session header */}
      <View className="flex-row items-center justify-between border-b border-gray-100 p-4">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#E8E8ED]">
            <Ionicons name="videocam" size={20} color="#6B7280" />
          </View>
          <Text className="text-[17px] font-semibold text-[#000]">
            Session {sessions.length > 1 ? index + 1 : ""}
          </Text>
        </View>
        {item.duration && (
          <View className="rounded-full bg-[#E8E8ED] px-3 py-1">
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
        <View className="border-t border-gray-100 p-4">
          <Text className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500">
            Participants ({item.participants.length})
          </Text>
          {item.participants.map((participant, pIndex) => (
            <View
              key={participant.id || pIndex}
              className="mb-2 flex-row items-center rounded-xl bg-[#F2F2F7] p-3"
            >
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-[#E8E8ED]">
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

  return (
    <FullScreenModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[#F2F2F7]" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <View style={{ width: 50 }} />
          <Text className="text-[17px] font-semibold text-[#000]">Session Details</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-base font-medium text-[#007AFF]">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4" style={{ paddingBottom: insets.bottom }}>
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#007AFF" />
              <Text className="mt-3 text-[15px] text-gray-500">Loading session details...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#E8E8ED]">
                <Ionicons name="information-circle" size={32} color="#8E8E93" />
              </View>
              <Text className="text-center text-[17px] font-semibold text-[#000]">
                No session details available
              </Text>
              <Text className="mt-2 text-center text-[15px] leading-5 text-gray-500">
                Session details may not be available for all meetings.
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              renderItem={renderSession}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          )}
        </View>
      </View>
    </FullScreenModal>
  );
}
