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
  const renderSession = ({ item, index }: { item: ConferencingSession; index: number }) => (
    <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      {/* Session header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="videocam" size={20} color="#6B7280" />
          <Text className="ml-2 text-base font-medium text-gray-900">
            Session {sessions.length > 1 ? index + 1 : ""}
          </Text>
        </View>
        {item.duration && (
          <View className="rounded-full bg-gray-100 px-2 py-1">
            <Text className="text-xs text-gray-600">{formatDuration(item.duration)}</Text>
          </View>
        )}
      </View>

      {/* Session details */}
      <View className="space-y-2">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#9CA3AF" />
          <Text className="ml-2 text-sm text-gray-600">Started: {formatDate(item.startTime)}</Text>
        </View>
        {item.endTime && (
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#9CA3AF" />
            <Text className="ml-2 text-sm text-gray-600">Ended: {formatTime(item.endTime)}</Text>
          </View>
        )}
        {item.maxParticipants && (
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={16} color="#9CA3AF" />
            <Text className="ml-2 text-sm text-gray-600">
              Max participants: {item.maxParticipants}
            </Text>
          </View>
        )}
      </View>

      {/* Participants */}
      {item.participants && item.participants.length > 0 && (
        <View className="mt-4">
          <Text className="mb-2 text-sm font-medium text-gray-700">
            Participants ({item.participants.length})
          </Text>
          {item.participants.map((participant, pIndex) => (
            <View
              key={participant.id || pIndex}
              className="mb-2 flex-row items-center rounded-lg bg-gray-50 p-2"
            >
              <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                <Ionicons name="person" size={16} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">
                  {participant.userName || "Unknown participant"}
                </Text>
                <Text className="text-xs text-gray-500">
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
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <View style={{ width: 60 }} />
          <Text className="text-lg font-semibold">Session Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base font-medium text-black">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#000" />
              <Text className="mt-2 text-gray-500">Loading session details...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="information-circle" size={48} color="#9CA3AF" />
              <Text className="mt-2 text-base text-gray-500">No session details available</Text>
              <Text className="mt-1 text-center text-sm text-gray-400">
                Session details may not be available for all meetings.
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              renderItem={renderSession}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </FullScreenModal>
  );
}
