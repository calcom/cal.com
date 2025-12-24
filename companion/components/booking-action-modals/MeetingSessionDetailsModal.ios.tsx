/**
 * MeetingSessionDetailsModal Component - iOS Implementation
 *
 * iOS-specific modal for viewing meeting session details with Glass UI header.
 */
import type { ConferencingSession } from "../../services/types/bookings.types";
import { FullScreenModal } from "../FullScreenModal";
import { GlassModalHeader } from "../GlassModalHeader";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface MeetingSessionDetailsModalProps {
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

export default function MeetingSessionDetailsModal(props: MeetingSessionDetailsModalProps) {
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
            Session {props.sessions.length > 1 ? index + 1 : ""}
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
      </View>

      {/* Participants */}
      {item.participants && item.participants.length > 0 && (
        <View className="border-t border-gray-100 p-4">
          <Text className="mb-3 text-[13px] font-medium uppercase tracking-wide text-gray-500">
            Participants ({item.participants.length})
          </Text>
          {item.participants.map((participant, pIndex) => (
            <View
              key={pIndex}
              className={`flex-row items-center ${pIndex < item.participants!.length - 1 ? "mb-3" : ""}`}
            >
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#E8E8ED]">
                <Ionicons name="person" size={16} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] text-[#000]">{participant.name || "Unknown"}</Text>
                {participant.email && (
                  <Text className="mt-0.5 text-[13px] text-gray-500">{participant.email}</Text>
                )}
              </View>
              {participant.duration && (
                <Text className="text-[13px] text-gray-500">
                  {formatDuration(participant.duration)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <FullScreenModal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <View className="flex-1 bg-[#F2F2F7]">
        {/* Header */}
        <GlassModalHeader title="Session Details" onClose={props.onClose} />

        {/* Content */}
        <View className="flex-1 p-4" style={{ paddingBottom: insets.bottom }}>
          {props.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#007AFF" />
              <Text className="mt-4 text-[15px] text-gray-500">Loading session details...</Text>
            </View>
          ) : props.sessions.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#E8E8ED]">
                <Ionicons name="information-circle-outline" size={32} color="#6B7280" />
              </View>
              <Text className="mb-2 text-center text-[17px] font-medium text-[#000]">
                No Session Details
              </Text>
              <Text className="text-center text-[15px] text-gray-500">
                Session details will appear here after the meeting.
              </Text>
            </View>
          ) : (
            <FlatList
              data={props.sessions}
              renderItem={renderSession}
              keyExtractor={(item, index) => `${item.id || index}`}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </FullScreenModal>
  );
}
